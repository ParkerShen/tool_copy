// src/models/userManagement.ts
import { useState } from 'react';
import { message } from 'antd';
// import { getUsers, createUser, updateUser, deleteUser } from '@/services/user';

export default () => {
  const [tableData, setTableData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentItem, setCurrentItem] = useState(null);

  const loadData = async () => {
    // const res = await getUsers();
    const res = { data: [
      { id: 1, name: '张三'} ] }
    setTableData(res.data);
  };

  const openModal = (mode: 'create' | 'edit', record = null) => {
    setModalMode(mode);
    setCurrentItem(record);
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const handleSubmit = async (mode, values) => {
    try {
      if (mode === 'create') {
        // await createUser(values);
        message.success('创建成功');
      } else {
        // await updateUser({ id: currentItem.id, ...values });
        message.success('更新成功');
      }
      loadData();
      closeModal();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      // await deleteUser(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  return {
    tableData,
    modalVisible,
    modalMode,
    currentItem,
    loadData,
    openModal,
    closeModal,
    handleSubmit,
    handleDelete
  };
};