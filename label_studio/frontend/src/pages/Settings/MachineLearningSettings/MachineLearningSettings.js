import { useCallback, useContext, useEffect, useState } from 'react';
import { Button } from '../../../components';
import { Description } from '../../../components/Description/Description';
import { Divider } from '../../../components/Divider/Divider';
import { ErrorWrapper } from '../../../components/Error/Error';
import { InlineError } from '../../../components/Error/InlineError';
import { Form, Input, Label, TextArea, Toggle } from '../../../components/Form';
import { modal } from '../../../components/Modal/Modal';
import { useAPI } from '../../../providers/ApiProvider';
import { ProjectContext } from '../../../providers/ProjectProvider';
import { MachineLearningList } from './MachineLearningList';
import { ProjectModelVersionSelector } from './ProjectModelVersionSelector';
import { ModelVersionSelector } from './ModelVersionSelector';
import { FF_DEV_1682, isFF } from '../../../utils/feature-flags';
import './MachineLearningSettings.styl';

export const MachineLearningSettings = () => {
  const api = useAPI();
  const { project, fetchProject } = useContext(ProjectContext);
  const [mlError, setMLError] = useState();
  const [backends, setBackends] = useState([]);

  const fetchBackends = useCallback(async () => {
    const models = await api.callApi('mlBackends', {
      params: {
        project: project.id,
      },
    });

    if (models) setBackends(models);
  }, [api, project, setBackends]);

  const showMLFormModal = useCallback((backend) => {
    const action = backend ? "updateMLBackend" : "addMLBackend";

    const modalProps = {
      title: `${backend ? '编辑' : '添加'} 模型`,
      style: { width: 760 },
      closeOnClickOutside: false,
      body: (
        <Form
          action={action}
          formData={{ ...(backend ?? {}) }}
          params={{ pk: backend?.id }}
          onSubmit={async (response) => {
            if (!response.error_message) {
              await fetchBackends();
              modalRef.close();
            }
          }}
        >
          <Input type="hidden" name="project" value={project.id}/>

          <Form.Row columnCount={2}>
            <Input name="title" label="标题" placeholder="机器学习模型"/>
            <Input name="url" label="URL" required/>
          </Form.Row>

          <Form.Row columnCount={1}>
            <TextArea name="description" label="描述" style={{ minHeight: 120 }}/>
          </Form.Row>

          {isFF(FF_DEV_1682) && !!backend && (
            <Form.Row columnCount={2}>
              <ModelVersionSelector
                object={backend}
                apiName="modelVersions"
                label="Version"
              />
            </Form.Row>
          )}

          {isFF(FF_DEV_1682) && (
            <Form.Row columnCount={1}>
              <div>
                <Toggle
                  name="auto_update"
                  label="Allow version auto-update"
                />
              </div>
            </Form.Row>
          )}

          <Form.Row columnCount={1}>
            <div>
              <Toggle
                name="is_interactive"
                label="用于交互式预告"
              />
            </div>
          </Form.Row>

          <Form.Actions>
            <Button type="submit" look="primary" onClick={() => setMLError(null)}>
              验证并保存
            </Button>
          </Form.Actions>

          <Form.ResponseParser>{response => (
            <>
              {response.error_message && (
                <ErrorWrapper error={{
                  response: {
                    detail: `Failed to ${backend ? 'save' : 'add new'} ML backend.`,
                    exc_info: response.error_message,
                  },
                }}/>
              )}
            </>
          )}</Form.ResponseParser>

          <InlineError/>
        </Form>
      ),
    };

    const modalRef = modal(modalProps);
  }, [project, fetchBackends, mlError]);

  useEffect(() => {
    if (project.id) {
      fetchBackends();
    }
  }, [project]);

  return (
    <>
      <Description style={{ marginTop: 0, maxWidth: 680 }}>
      添加一个或多个机器学习模型来预测数据的标注。要在不连接模型的情况下导入预测功能，请参阅文档。
        {" "}
        <a href="https://labelstud.io/guide/predictions.html" target="_blank">
          see the documentation
        </a>.
      </Description>
      <Button onClick={() => showMLFormModal()}>
      添加模型
      </Button>

      <Divider height={32}/>

      <Form action="updateProject"
        formData={{ ...project }}
        params={{ pk: project.id }}
        onSubmit={() => fetchProject()}
        autosubmit
      >
        <Form.Row columnCount={1}>
          <Label text="机器辅助标注" large/>

          <div style={{ paddingLeft: 16 }}>
            <Toggle
              label="提交或更新标注后开始模型培训"
              name="start_training_on_annotation_update"
            />
          </div>

          <div style={{ paddingLeft: 16 }}>
            <Toggle
              label="加载任务时自动检索显示机器辅助标注"
              name="evaluate_predictions_automatically"
            />
          </div>

          <div style={{ paddingLeft: 16 }}>
            <Toggle
              label="Show predictions to annotators in the Label Stream and Quick View"
              name="show_collab_predictions"
            />
          </div>
        </Form.Row>

        {!isFF(FF_DEV_1682) && (
          <ProjectModelVersionSelector />
        )}

        <Form.Actions>
          <Form.Indicator>
            <span case="success">已保存!</span>
          </Form.Indicator>
          <Button type="submit" look="primary" style={{ width: 120 }}>保存</Button>
        </Form.Actions>
      </Form>

      <MachineLearningList
        onEdit={(backend) => showMLFormModal(backend)}
        fetchBackends={fetchBackends}
        backends={backends}
      />
    </>
  );
};

MachineLearningSettings.title = "机器学习";
MachineLearningSettings.path = "/ml";
