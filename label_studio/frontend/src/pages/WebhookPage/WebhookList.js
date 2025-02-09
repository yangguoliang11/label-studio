import React, { useCallback } from 'react';
import { LsCross, LsPencil, LsPlus } from '../../assets/icons';
import { Button } from '../../components';
import { Form, Label, Input, Toggle } from '../../components/Form';
import { modal } from '../../components/Modal/Modal';
import { Elem, Block } from '../../utils/bem';
import "./WebhookPage.styl";
import { format } from 'date-fns';
import { useAPI } from '../../providers/ApiProvider';
import { WebhookDeleteModal } from './WebhookDeleteModal';
import { useProject } from '../../providers/ProjectProvider';


const WebhookList = ({ onSelectActive, onAddWebhook, webhooks, fetchWebhooks }) => {

  const api = useAPI();

  if (webhooks === null) return <></>;

  const onActiveChange = useCallback( async (event) => {
    let value = event.target.checked;
    await api.callApi('updateWebhook', {
      params: {
        pk: event.target.name,
      },
      body: {
        is_active: value,
      },
    });
    await fetchWebhooks();
  }, [api]);

  return <Block name='webhook'>
    <Elem name='controls'>
      <Button onClick={onAddWebhook}>
        添加webhook
      </Button>
    </Elem>
    <Elem>
      {webhooks.length === 0? 
        null
        :
        <Block name='webhook-list'>
          {
            webhooks.map(
              (obj) => <Elem key={obj.id} name='item'>
                <Elem name='item-active'>
                  <Toggle
                    name={obj.id}
                    checked={obj.is_active}
                    onChange={onActiveChange} 
                  />
                </Elem>
                <Elem name='item-url' onClick={() => onSelectActive(obj.id)}>
                  {obj.url}
                </Elem>
                <Elem name='item-date'>
                  创建于 {format(new Date(obj.created_at), 'dd MMM yyyy, HH:mm')}
                </Elem>
                <Elem name='item-control'>
                  <Button
                    onClick={() => onSelectActive(obj.id)}
                    icon={<LsPencil />}
                  >编辑</Button>
                  <Button
                    onClick={()=> WebhookDeleteModal({ 
                      onDelete: async ()=>{
                        await api.callApi('deleteWebhook', {params:{pk:obj.id}});
                        await fetchWebhooks();
                      },
                    })}
                    look='danger'
                    icon={<LsCross />}
                  >删除</Button>
                </Elem>
              </Elem>,
            )
          }
        </Block>}
    </Elem>
  </Block>;
};


export default WebhookList;
