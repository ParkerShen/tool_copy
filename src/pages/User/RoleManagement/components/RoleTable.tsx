/*
 * @Date: 2025-06-29 21:14:55
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-01 14:59:27
 * @FilePath: \xin-admin\src\pages\User\RoleManagement\components\RoleTable.tsx
 */

import React from 'react';
import { Button, Space, Tag } from 'antd';
import ProTable, { ProColumns } from '@ant-design/pro-table';
import { RoleItem, RoleTableProps } from '@/pages/User/RoleManagement/roletypes';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const UserTable: React.FC<RoleTableProps> = ({
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
  const columns: ProColumns<RoleItem>[] = [
    // {
    //   title: 'ID',
    //   dataIndex: 'id',
    //   hideInSearch: true,
    // },
    {
      title: '角色名称',
      dataIndex: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
    },
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
      title: '创建时间',
      dataIndex: 'cTime',
      valueType: 'dateTime',
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'cTimeRange',
      valueType: 'dateTimeRange',
      hideInTable: true, // 不在表格中显示
      search: {
        transform: (value) => {
          // 将时间范围拆分为 startTime 和 endTime
          return {
            startTime: dayjs(value[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
            endTime: dayjs(value[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss'),
          };
        },
      },
      fieldProps: {
        placeholder: ['开始时间', '结束时间'],
        // 可选：禁用未来日期
        disabledDate: (current: dayjs.Dayjs) => current && current > dayjs().endOf('day'),
      },
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record: RoleItem) => (
        <Space>
          <Button onClick={() => onEdit(record)}>编辑</Button>
          {record.name === '系统管理员' ? null : (
            <Button danger onClick={() => record.roleId !== undefined && onDelete(record.roleId)}>
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ProTable<RoleItem>
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
        ],
      }}
      onSubmit={onReset}
      columns={columns}
      dataSource={data}
      rowKey="userId"
      loading={loading}
      toolBarRender={() => [
        <Button key="create" type="primary" onClick={onCreate}>
          新增角色
        </Button>,
      ]}
    />
  );
};

export default UserTable;
