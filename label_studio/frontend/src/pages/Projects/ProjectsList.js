import chr from 'chroma-js';
import { format } from 'date-fns';
import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { LsBulb, LsCheck, LsEllipsis, LsMinus } from '../../assets/icons';
import { Button, Dropdown, Menu, Pagination, Userpic } from '../../components';
import { Block, Elem } from '../../utils/bem';
import { absoluteURL } from '../../utils/helpers';

export const ProjectsList = ({ projects, currentPage, totalItems, loadNextPage, pageSize }) => {
  return (
    <>
      <Elem name="list">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project}/>
        ))}
      </Elem>
      <Elem name="pages">
        <Pagination
          name="projects-list"
          label="项目"
          page={currentPage}
          totalItems={totalItems}
          urlParamName="page"
          pageSize={pageSize}
          pageSizeOptions={[10, 30, 50, 100]}
          onPageLoad={(page, pageSize) => loadNextPage(page, pageSize)}
        />
      </Elem>
    </>
  );
};

export const EmptyProjectsList = ({ openModal }) => {
  return (
    <Block name="empty-projects-page">
      <Elem name="heidi" tag="img" src={absoluteURL("/static/images/opossum_looking.png")} />
      <Elem name="header" tag="h1">Heidi 没有看到任何项目</Elem>
      <p>创建一个项目并开始导入标签吧</p>
      <Elem name="action" tag={Button} onClick={openModal} look="primary">创建项目</Elem>
    </Block>
  );
};

const ProjectCard = ({ project }) => {
  const color = useMemo(() => {
    return project.color === '#FFFFFF' ? null : project.color;
  }, [project]);

  const projectColors = useMemo(() => {
    return color ? {
      '--header-color': color,
      '--background-color': chr(color).alpha(0.2).css(),
    } : {};
  }, [color]);

  return (
    <Elem tag={NavLink} name="link" to={`/projects/${project.id}/data`} data-external>
      <Block name="project-card" mod={{ colored: !!color }} style={projectColors}>
        <Elem name="header">
          <Elem name="title">
            <Elem name="title-text">
              {project.title ?? "新建项目"}
            </Elem>

            <Elem name="menu" onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}>
              <Dropdown.Trigger content={(
                <Menu>
                  <Menu.Item href={`/projects/${project.id}/settings`}>设置</Menu.Item>
                  <Menu.Item href={`/projects/${project.id}/data?labeling=1`}>标记</Menu.Item>
                </Menu>
              )}>
                <Button size="small" type="text" icon={<LsEllipsis/>}/>
              </Dropdown.Trigger>
            </Elem>
          </Elem>
          <Elem name="summary">
            <Elem name="annotation">
              <Elem name="total">
                {project.finished_task_number} / {project.task_number}
              </Elem>
              <Elem name="detail">
                <Elem name="detail-item" mod={{ type: "completed" }}>
                  <Elem tag={LsCheck} name="icon"/>
                  {project.total_annotations_number}
                </Elem>
                <Elem name="detail-item" mod={{ type: "rejected" }}>
                  <Elem tag={LsMinus} name="icon"/>
                  {project.skipped_annotations_number}
                </Elem>
                <Elem name="detail-item" mod={{ type: "predictions" }}>
                  <Elem tag={LsBulb} name="icon"/>
                  {project.total_predictions_number}
                </Elem>
              </Elem>
            </Elem>
          </Elem>
        </Elem>
        <Elem name="description">
          {project.description}
        </Elem>
        <Elem name="info">
          <Elem name="created-date">
            {format(new Date(project.created_at), "yyyy-MM-dd HH:mm")}
          </Elem>
          <Elem name="created-by">
            <Userpic src="#" user={project.created_by} showUsername/>
          </Elem>
        </Elem>
      </Block>
    </Elem>
  );
};
