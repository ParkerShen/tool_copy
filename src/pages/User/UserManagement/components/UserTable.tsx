// src/pages/UserManagement/components/UserTable.tsx
import React from 'react';
import { Button, Space } from 'antd';
import ProTable, { ProColumns } from '@ant-design/pro-table';
import { UserItem, UserTableProps } from '../userTypes';

const UserTable: React.FC<UserTableProps> = ({ 
  data, 
  onEdit, 
  onDelete, 
  onCreate 
}) => {
  const columns: ProColumns<UserItem>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      hideInSearch: true,
      hideInTable: true,
    },
    {
      title: '姓名',
      dataIndex: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record: UserItem) => (
        <Space>
          <Button onClick={() => onEdit(record)}>编辑</Button>
          <Button 
            danger 
            onClick={() => onDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<UserItem>
      columns={columns}
      dataSource={data}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      toolBarRender={() => [
        <Button 
          key="create" 
          type="primary" 
          onClick={onCreate}
        >
          新增用户
        </Button>
      ]}
    />
  );
};

export default UserTable;