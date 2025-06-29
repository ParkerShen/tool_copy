/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-23 16:08:41
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-29 21:00:15
 * @FilePath: \xin-admin\src\pages\User\UserManagement\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/pages/UserManagement/index.tsx
import React, { useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from 'umi';
import UserTable from '@/pages/User/UserManagement/components/UserTable';
import UserForm from '@/pages/User/UserManagement/components/UserForm';
import { UserItem } from '@/pages/User/UserManagement/usertypes';

const UserManagement: React.FC = () => {
  const {
    tableData,
    modalVisible,
    modalMode,
    currentItem,

    openModal,
    closeModal,
    handleSubmit,
    handleDelete,
    loadData,
    handlePageChange,
    handleSearch,
    resetData,
    pagination,
  } = useModel('userManagement');

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PageContainer>
      <UserTable
        data={tableData}
        onEdit={(record: UserItem) => openModal('edit', record)}
        onDelete={handleDelete}
        onCreate={() => openModal('create')}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onReset={resetData}
      />

      {modalVisible && (
        <UserForm
          visible={modalVisible}
          mode={modalMode}
          initialValues={currentItem || undefined}
          onSubmit={(values) => handleSubmit(modalMode, values)}
          onCancel={closeModal}
        />
      )}
    </PageContainer>
  );
};

export default UserManagement;
