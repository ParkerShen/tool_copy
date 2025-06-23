// src/pages/UserManagement/index.tsx
import React, { useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from 'umi';
import UserTable from './components/UserTable';
import UserForm from './components/UserForm';
import { UserItem, FormMode } from './userTypes';

const UserManagement: React.FC = () => {
  const { 
    tableData, 
    modalVisible,
    modalMode,
    currentItem,
    loadData,
    openModal,
    closeModal,
    handleSubmit,
    handleDelete
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