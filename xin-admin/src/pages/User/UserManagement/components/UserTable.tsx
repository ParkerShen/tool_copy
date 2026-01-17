/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-23 16:13:16
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-30 15:47:23
 * @FilePath: \xin-admin\src\pages\User\UserManagement\components\UserTable.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/pages/UserManagement/components/UserTable.tsx
import React from 'react';
import { Button, Space, Tag } from 'antd';
import ProTable, { ProColumns } from '@ant-design/pro-table';
import { UserItem, UserTableProps } from '@/pages/User/UserManagement/usertypes';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const UserTable: React.FC<UserTableProps> = ({
  data,
  onEdit,
  onDelete,
  onCreate,
  loading,
  pagination,
  onPageChange,
  onSearch,
  onReset,
}) => {
  const columns: ProColumns<UserItem>[] = [
    // {
    //   title: 'ID',
    //   dataIndex: 'id',
    //   hideInSearch: true,
    // },
    {
      title: '用户名',
      dataIndex: 'username',
    },
    // {
    //   title: '邮箱',
    //   dataIndex: 'email',
    // },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        0: { text: '禁用', status: 'Error' },
        1: { text: '启用', status: 'Success' },
      },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'red'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '账号类型',
      dataIndex: 'isAdmin',
      valueEnum: {
        0: { text: '用户', status: 'Error' },
        1: { text: '平台', status: 'Success' },
      },
      render: (_, record) => (
        <Tag color={record.isAdmin === 1 ? 'black' : 'yellow'}>
          {record.isAdmin === 1 ? '平台' : '用户'}
        </Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'Roles',
      hideInSearch: true,
      render: (_, record) => (
        <Space>{record.Roles?.map((item) => <Tag key={item.roleName}>{item.roleName}</Tag>)}</Space>
      ),
    },
    {
      title: '登录次数',
      dataIndex: 'loginCount',
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'cTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'cTimeRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
      search: {
        transform: (value) => {
          // 直接返回时间戳或 ISO 字符串
          return {
            startTime: value[0].valueOf(), // 时间戳（数字）
            endTime: value[1].valueOf(),
          };
        },
      },
      fieldProps: {
        placeholder: ['开始时间', '结束时间'],
        disabledDate: (current: any) => current > dayjs().endOf('day'),
      },
    },
    {
      title: '最后上线时间',
      dataIndex: 'lastLoginAt',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record: UserItem) => (
        <Space>
          <Button onClick={() => onEdit(record)}>编辑</Button>
          {record.username === 'admin' ? null : (
            <Button danger onClick={() => record.userId !== undefined && onDelete(record.userId)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ProTable<UserItem>
      // onChange={handleTableChange}
      pagination={{
        ...pagination,
        showSizeChanger: true,
        onChange: (page, pageSize) => {
          onPageChange(page, pageSize);
        },
      }}
      search={{
        labelWidth: 'auto',
        span: 6,
        optionRender: ({ searchText, resetText }, { form }) => [
          <Button
            key="search"
            type="primary"
            onClick={() => (form ? onSearch(form.getFieldsValue()) : undefined)}
          >
            {searchText}
          </Button>,
          <Button
            key="reset"
            onClick={() => {
              form?.resetFields();
              form?.submit();
            }}
          >
            {resetText}
          </Button>,
          // <Button key="export" disabled>
          //   导出数据
          // </Button>,
        ],
      }}
      onSubmit={onReset}
      columns={columns}
      dataSource={data}
      rowKey="userId"
      loading={loading}
      toolBarRender={() => [
        <Button key="create" type="primary" onClick={onCreate}>
          新增用户
        </Button>,
      ]}
    />
  );
};

export default UserTable;
