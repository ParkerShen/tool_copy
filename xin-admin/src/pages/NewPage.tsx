import { useAccess } from '@umijs/max';
import { HeartTwoTone, SmileTwoTone } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Alert, Card, Typography, Button } from 'antd';
import React from 'react';

const NewPage: React.FC = () => {
  const intl = useIntl();
  const access = useAccess(); // 获取权限对象
  return (
    <PageContainer
      content={intl.formatMessage({
        id: 'pages.admin.subPage.title',
        defaultMessage: 'This page can only be viewed by admin',
      })}
    >
      <Card>
        <Alert
          message={intl.formatMessage({
            id: 'pages.welcome.alertMessage',
            defaultMessage: 'Faster and stronger heavy-duty components have been released.',
          })}
          type="success"
          showIcon
          banner
          style={{
            margin: -12,
            marginBottom: 48,
          }}
        />
        <p> 新的页新的页新的页</p>
        <Typography.Title level={2} style={{ textAlign: 'center' }}>
          <SmileTwoTone /> xxx <HeartTwoTone twoToneColor="#eb2f96" /> You
        </Typography.Title>
         {/* 添加带权限控制的按钮 */}
         <div style={{ textAlign: 'center', margin: '20px 0' }}>
          {/* 管理按钮 - 需要 user:edit 权限 */}
          {access.hasPermission('user:edit') && (
            <Button 
              type="primary" 
              style={{ marginRight: '10px' }}
              onClick={() => alert('用户编辑操作')}
            >
              编辑用户
            </Button>
          )}
          
          {/* 查看按钮 - 需要 order:view 权限 */}
          {access.hasPermission('order:view') && (
            <Button 
              style={{ marginRight: '10px' }}
              onClick={() => alert('订单查看操作')}
            >
              查看订单
            </Button>
          )}
          
          {/* 高级管理按钮 - 需要 admin:access 权限 */}
          {access.hasPermission('admin:access') && (
            <Button 
              danger
              onClick={() => alert('管理员高级操作')}
            >
              管理员功能
            </Button>
          )}
        </div>
      </Card>
      <p style={{ textAlign: 'center', marginTop: 24 }}>
        Want to add more pages? Please refer to{' '}
        <a href="https://pro.ant.design/docs/block-cn" target="_blank" rel="noopener noreferrer">
          use block
        </a>
        。
      </p>
    </PageContainer>
  );
};

export default NewPage;
