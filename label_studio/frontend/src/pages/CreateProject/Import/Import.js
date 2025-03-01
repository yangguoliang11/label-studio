import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Modal } from '../../../components/Modal/Modal';
import { cn } from '../../../utils/bem';
import { unique } from '../../../utils/helpers';
import "./Import.styl";
import { IconError, IconInfo, IconUpload } from '../../../assets/icons';
import { useAPI } from '../../../providers/ApiProvider';

const importClass = cn("upload_page");
const dropzoneClass = cn("dropzone");

function flatten(nested) {
  return [].concat(...nested);
}

function traverseFileTree(item, path) {
  return new Promise((resolve) => {
    path = path || "";
    if (item.isFile) {
      // Avoid hidden files
      if (item.name[0] === ".") return resolve([]);

      resolve([item]);
    } else if (item.isDirectory) {
      // Get folder contents
      const dirReader = item.createReader();
      const dirPath = path + item.name + "/";

      dirReader.readEntries(function(entries) {
        Promise.all(entries.map(entry => traverseFileTree(entry, dirPath)))
          .then(flatten)
          .then(resolve);
      });
    }
  });
}

function getFiles(files) {
  // @todo this can be not a files, but text or any other draggable stuff
  return new Promise(resolve => {
    if (!files.length) return resolve([]);
    if (!files[0].webkitGetAsEntry) return resolve(files);

    // Use DataTransferItemList interface to access the file(s)
    const entries = Array.from(files).map(file => file.webkitGetAsEntry());

    Promise.all(entries.map(traverseFileTree))
      .then(flatten)
      .then(fileEntries => fileEntries.map(fileEntry => new Promise(res => fileEntry.file(res))))
      .then(filePromises => Promise.all(filePromises))
      .then(resolve);
  });
}

const Footer = () => {
  return (
    <Modal.Footer>
      <IconInfo className={importClass.elem("info-icon")} width="20" height="20" />
      See the&nbsp;documentation to <a target="_blank" href="https://labelstud.io/guide/predictions.html">import preannotated data</a>{" "}
      or&nbsp;to <a target="_blank" href="https://labelstud.io/guide/storage.html">sync data from a&nbsp;database or&nbsp;cloud storage</a>.
    </Modal.Footer>
  );
};

const Upload = ({ children, sendFiles }) => {
  const [hovered, setHovered] = useState(false);
  const onHover = (e) => {
    e.preventDefault();
    setHovered(true);
  };
  const onLeave = setHovered.bind(null, false);
  const dropzoneRef = useRef();

  const onDrop = useCallback(e => {
    e.preventDefault();
    onLeave();
    getFiles(e.dataTransfer.items).then(files => sendFiles(files));
  }, [onLeave, sendFiles]);

  return (
    <div id="holder" className={dropzoneClass.mod({ hovered })} ref={dropzoneRef}
      onDragStart={onHover}
      onDragOver={onHover}
      onDragLeave={onLeave}
      onDrop={onDrop}
      // {...getRootProps}
    >
      {children}
    </div>
  );
};

const ErrorMessage = ({ error }) => {
  if (!error) return null;
  let extra = error.validation_errors ?? error.extra;
  // support all possible responses

  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    extra = extra.non_field_errors ?? Object.values(extra);
  }
  if (Array.isArray(extra)) extra = extra.join("; ");

  return (
    <div className={importClass.elem("error")}>
      <IconError style={{ marginRight: 8 }} />
      {error.id && `[${error.id}] `}
      {error.detail || error.message}
      {extra && ` (${extra})`}
    </div>
  );
};

export const ImportPage = ({
  project,
  show = true,
  onWaiting,
  onFileListUpdate,
  highlightCsvHandling,
  dontCommitToProject = false,
  csvHandling,
  setCsvHandling,
  addColumns,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();
  const [ids, _setIds] = useState([]);
  const api = useAPI();

  const processFiles = (state, action) => {
    if (action.sending) {
      return { ...state, uploading: [...action.sending, ...state.uploading] };
    }
    if (action.sent) {
      return { ...state, uploading: state.uploading.filter(f => !action.sent.includes(f)) };
    }
    if (action.uploaded) {
      return { ...state, uploaded: unique([...state.uploaded, ...action.uploaded], (a, b) => a.id === b.id) };
    }
    // if (action.ids) {
    //   const ids = unique([...state.ids, ...action.ids]);
    //   onFileListUpdate?.(ids);
    //   return {...state, ids };
    // }
    return state;
  };
  const [files, dispatch] = useReducer(processFiles, { uploaded: [], uploading: [] });
  const showList = Boolean(files.uploaded?.length || files.uploading?.length);

  const setIds = (ids) => {
    _setIds(ids);
    onFileListUpdate?.(ids);
  };

  const loadFilesList = useCallback(async (file_upload_ids) => {
    const query = {};

    if (file_upload_ids) {
      // should be stringified array "[1,2]"
      query.ids = JSON.stringify(file_upload_ids);
    }
    const files = await api.callApi("fileUploads", {
      params: { pk: project.id, ...query },
    });

    dispatch({ uploaded: files ?? [] });
    if (files?.length) {
      setIds(unique([...ids, ...files.map(f => f.id)]));
    }
    return files;
  }, [project]);

  const onStart = () => {
    setLoading(true);
    setError(null);
  };
  const onError = err => {
    console.error(err);
    // @todo workaround for error about input size in a wrong html format
    if (typeof err === "string" && err.includes("RequestDataTooBig")) {
      const message = "Imported file is too big";
      const extra = err.match(/"exception_value">(.*)<\/pre>/)?.[1];

      err = { message, extra };
    }
    setError(err);
    setLoading(false);
    onWaiting?.(false);
  };
  const onFinish = useCallback(res => {
    const { could_be_tasks_list, data_columns, file_upload_ids } = res;
    const file_ids = [...ids, ...file_upload_ids];

    setIds(file_ids);
    if (could_be_tasks_list && !csvHandling) setCsvHandling("choose");
    setLoading(true);
    onWaiting?.(false);
    addColumns(data_columns);
    return loadFilesList(file_ids).then(() => setLoading(false));
  }, [addColumns, loadFilesList, setIds, ids, setLoading]);

  const importFiles = useCallback(async (files, body) => {
    dispatch({ sending: files });

    const query = dontCommitToProject ? { commit_to_project: "false" } : {};
    // @todo use json for dataset uploads by URL
    const contentType = body instanceof FormData
      ? 'multipart/form-data' // usual multipart for usual files
      : 'application/x-www-form-urlencoded'; // chad urlencoded for URL uploads
    const res = await api.callApi("importFiles", {
      params: { pk: project.id, ...query },
      headers: { 'Content-Type': contentType },
      body,
      errorFilter: () => true,
    });

    if (res && !res.error) onFinish?.(res);
    else onError?.(res?.response);

    dispatch({ sent: files });
  }, [project, onFinish]);

  const sendFiles = useCallback(files => {
    onStart();
    onWaiting?.(true);
    files = [...files]; // they can be array-like object
    const fd = new FormData;

    for (let f of files) fd.append(f.name, f);
    return importFiles(files, fd);
  }, [importFiles, onStart]);

  const onUpload = useCallback(e => {
    sendFiles(e.target.files);
    e.target.value = "";
  }, [sendFiles]);

  const onLoadURL = useCallback(e => {
    e.preventDefault();
    onStart();
    const url = urlRef.current?.value;

    if (!url) {
      setLoading(false);
      return;
    }
    urlRef.current.value = "";
    onWaiting?.(true);
    const body = new URLSearchParams({ url });

    importFiles([{ name: url }], body);
  }, [importFiles]);

  useEffect(() => {
    if (project?.id !== undefined) {
      loadFilesList().then(files => {
        if (csvHandling) return;
        // empirical guess on start if we have some possible tasks list/time series problem
        if (Array.isArray(files) && files.some(({ file }) => /\.[ct]sv$/.test(file))) {
          setCsvHandling("choose");
        }
      });
    }
  }, [project, loadFilesList]);

  const urlRef = useRef();

  if (!project) return null;
  if (!show) return null;

  const csvProps = {
    name: "csv",
    type: "radio",
    onChange: e => setCsvHandling(e.target.value),
  };

  return (
    <div className={importClass}>
      {highlightCsvHandling && <div className={importClass.elem("csv-splash")}/>}
      <input id="file-input" type="file" name="file" multiple onChange={onUpload} style={{ display: "none" }}/>

      <header>
        <form className={importClass.elem("url-form") + " inline"} method="POST" onSubmit={onLoadURL}>
          <input placeholder="数据集URL" name="url" ref={urlRef} />
          <button type="submit">添加URL</button>
        </form>
        <span>或</span>
        <button onClick={() => document.getElementById('file-input').click()} className={importClass.elem("upload-button")}>
          <IconUpload width="16" height="16" className={importClass.elem("upload-icon")} />
          上传 {files.uploaded.length ? "More " : ""}文件
        </button>
        <div className={importClass.elem("csv-handling").mod({ highlighted: highlightCsvHandling, hidden: !csvHandling })}>
          <span>将CSV/TSV视为</span>
          <label><input {...csvProps} value="tasks" checked={csvHandling === "tasks"}/> 任务列表</label>
          <label><input {...csvProps} value="ts" checked={csvHandling === "ts"}/> 时间序列或全文文件</label>
        </div>
        <div className={importClass.elem("status")}>
          {files.uploaded.length
            ? `${files.uploaded.length} files uploaded`
            : ""}
        </div>
      </header>

      <ErrorMessage error={error} />

      <main>
        <Upload sendFiles={sendFiles} project={project}>
          {!showList && (
            <label htmlFor="file-input">
              <div className={dropzoneClass.elem("content")}>
                <header>将文件拖放到这里<br/>或点击浏览</header>
                <IconUpload height="64" className={dropzoneClass.elem("icon")} />
                <dl>
                  <dt>文本</dt><dd>txt</dd>
                  <dt>音频</dt><dd>wav, aiff, mp3, au, flac, m4a, ogg</dd>
                  <dt>视频</dt><dd>mpeg4/H.264 webp, webm*</dd>
                  <dt>图片</dt><dd>jpg, png, gif, bmp, svg, webp</dd>
                  <dt>网页</dt><dd>html, htm, xml</dd>
                  <dt>时间序列</dt><dd>csv, tsv</dd>
                  <dt>一般格式</dt><dd>csv, tsv, txt, json</dd>
                </dl>
                <b>
                   * –支持取决于浏览器<br/>
                   * –如果要导入大量文件，请使用<a href="https://labelstud.io/guide/storage.html" target="_blank">
                云存储</a>
                </b>
              </div>
            </label>
          )}

          {showList && (
            <table>
              <tbody>
                {files.uploading.map(file => (
                  <tr key={file.name}>
                    <td>{file.name}</td>
                    <td><span className={importClass.elem("file-status").mod({ uploading: true })} /></td>
                  </tr>
                ))}
                {files.uploaded.map(file => (
                  <tr key={file.file}>
                    <td>{file.file}</td>
                    <td><span className={importClass.elem("file-status")} /></td>
                    <td>{file.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Upload>
      </main>

      <Footer />
    </div>
  );
};
