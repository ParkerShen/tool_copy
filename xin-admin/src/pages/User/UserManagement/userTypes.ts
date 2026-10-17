/*
 * @Author: parker 960822987@qq.com
 * @Date: 2025-06-23 16:34:45
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-06-26 14:28:14
 * @FilePath: \xin-admin\src\pages\User\UserManagement\userTypes.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// src/pages/UserManagement/userTypes.ts
// 用户数据类型定义
export interface UserItem {
  id?: number;
  userId?: number;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;
  isAdmin: number;
  Roles: RolesItem[];
  roleNames: string[];
  createdAt?: string;
}
interface RolesItem {
  roleId: number; // 角色ID 
  roleName: string; // 角色名称
}
// 表单模式
export type FormMode = 'create' | 'edit';

// 表单提交参数
export interface SubmitParams {
  mode: FormMode;
  values: Partial<UserItem>;
}

// 表单组件Props
export interface UserFormProps {
  visible: boolean;
  mode: FormMode;
  initialValues?: Partial<UserItem>;
  onSubmit: (values: Partial<UserItem>) => void;
  onCancel: () => void;
  loading?: boolean;
}

// 表格组件Props
export interface UserTableProps {
  data: UserItem[];
  onEdit: (record: UserItem) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  loading?: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number, pageSize?: number) => void;
  onSearch: (values: any) => void;
  onReset: (values: any) => void;
}