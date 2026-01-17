/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-23 16:08:41
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-01 16:30:14
 * @FilePath: \xin-admin\src\pages\User\RoleManagement\index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/pages/UserManagement/index.tsx
import React, { useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from 'umi';
import RoleTable from '@/pages/User/RoleManagement/components/RoleTable';
import FuzzyRoleForm from '@/pages/User/RoleManagement/components/FuzzyRoleForm';
import { RoleItem } from '@/pages/User/RoleManagement/roletypes';

const RoleManagement: React.FC = () => {
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
    menuTreeData,
    getMenuTreeData,
  } = useModel('roleManagement');

  useEffect(() => {
    loadData();
    getMenuTreeData();
  }, []);

  return (
    <PageContainer>
      {!modalVisible && (
        <RoleTable
          data={tableData}
          onEdit={(record: RoleItem) => openModal('edit', record)}
          onDelete={handleDelete}
          onCreate={() => openModal('create')}
          pagination={pagination}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onReset={resetData}
        />
      )}
      {modalVisible && (
        <FuzzyRoleForm
          visible={modalVisible}
          onCancel={closeModal}
          treeData={menuTreeData}
          mode={modalMode}
          initialValues={currentItem || undefined}
          onSubmit={(values: any) => handleSubmit(modalMode, values)}
        />
      )}
    </PageContainer>
  );
};

export default RoleManagement;
