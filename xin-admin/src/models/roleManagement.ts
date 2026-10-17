// src/models/userManagement.ts
import { useState } from 'react';
import { message } from 'antd';
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  getAllTreeMenus,
} from '@/services/platform/api';
interface QueryParams {
  name?: string;
  status?: string | number;
  page?: number;
  pageSize?: number;
}
export default () => {
  // const [queryParams, setQueryParams] = useState<QueryParams>();
  const [tableData, setTableData] = useState<API.RoleItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentItem, setCurrentItem] = useState<API.RoleItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  // 权限树
  const [menuTreeData, setMenuTreeData] = useState<API.PermissionTreeNode>();
  const loadData = async (params?: QueryParams) => {
    setLoading(true);
    try {
      // 传递查询参数到后端
      const res = await getRoleList(
        params
          ? { ...params, status: params.status ? Number(params.status) : undefined }
          : undefined,
      );
      if (res.success && res.data) {
        setTableData(res.data);

        // 更新分页信息
        setPagination({
          current: res.current || 1,
          pageSize: res.pageSize || 10, // 如果后端没有返回 pageSize，默认设置为 10
          total: res.total, // 使用后端返回的总数
        });
      } else {
        message.error(res.message || '获取用户列表失败');
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取所有菜单树数据 getAllTreeMenus
  const getMenuTreeData = async () => {
    try {
      // 传递查询参数到后端
      const res = await getAllTreeMenus();
      if (res.success) {
        setMenuTreeData(res.data);
      }
    } catch (error: any) {
      message.error(error);
    }
  };

  const resetData = async () => {
    setLoading(true);
    try {
      const res = await getRoleList({ page: 1, pageSize: 10 });
      if (res.success && res.data) {
        setTableData(res.data);

        setPagination({
          current: res.current || 1,
          pageSize: res.pageSize || 10,
          total: res.total,
        });
      } else {
        message.error(res.message || '获取用户列表失败');
      }
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加分页和搜索处理函数
  const handlePageChange = (page: number, pageSize?: number) => {
    loadData({ page, pageSize });
  };

  const handleSearch = (values: Partial<QueryParams>) => {
    console.log(values);

    loadData({ ...values, page: 1, pageSize: 10 });
  };

  const openModal = (mode: 'create' | 'edit', record: API.RoleItem | null = null) => {
    setModalMode(mode);
    setCurrentItem(record);
    setModalVisible(true);
  };

  const closeModal = () => setModalVisible(false);

  const handleSubmit = async (mode: 'create' | 'edit', values: any) => {
    setLoading(true);

    try {
      if (mode === 'create') {
        const { name, status, description, accesss } = values;
        const params: API.RoleItem = {
          name,
          status,
          description,
          accesss,
        };
        const res = await createRole(params);
        if (res.success) {
          message.success('创建成功');
          loadData();
          closeModal();
        } else {
          message.error(res.message || '创建失败');
        }
      } else {
        const { roleId, name, status, description, accesss } = values;
        const params: API.RoleItem = {
          roleId,
          name,
          status,
          description,
          accesss,
        };
        const res = await updateRole(params);
        if (res.success) {
          message.success('更新成功');
          loadData();
          closeModal();
        } else {
          message.error(res.message || '更新失败');
        }
      }
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      console.log('id', id);
      const res = await deleteRole(id);
      if (res.success) {
        message.success(res.message);
        loadData();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  return {
    tableData,
    modalVisible,
    modalMode,
    currentItem,
    loading,
    loadData,
    openModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handlePageChange,
    handleSearch,
    pagination,
    resetData,
    menuTreeData,
    getMenuTreeData,
  };
};
