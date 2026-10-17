/*
 * @Date: 2025-06-29 21:14:55
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-01 16:28:39
 * @FilePath: \xin-admin\src\pages\User\RoleManagement\roletypes.ts
 */

// 用户数据类型定义
export interface RoleItem {
  id?: number;
  /*
  主键
  */
  roleId?: number;
  /*
  角色名
  */
  name?: string;
  /*
   描述
  */
  description?: string;
  /*
   创建时间
  */
  cTime?: string;
  /*
   status 0 禁用 1 启用
  */
  status?: number;

  permissions?: string[] | undefined;
}
// 表单模式
export type FormMode = 'create' | 'edit';

// 表单提交参数
export interface SubmitParams {
  mode: FormMode;
  values: Partial<RoleItem>;
}

//模糊提交组件
export interface FuzzyRoleFormProps {
  visible: boolean;
  onCancel: () => void;
  treeData: API.PermissionTreeNode | undefined;
  onSubmit: (values: Partial<RoleItem>) => void;
  mode: string;
  initialValues: RoleItem | undefined;
}

// 表单组件Props
// export interface RoleTableProps {
//   visible: boolean;
//   mode: FormMode;
//   initialValues?: Partial<RoleItem>;
//   onSubmit: (values: Partial<RoleItem>) => void;
//   onCancel: () => void;
//   loading?: boolean;
// }

// 表格组件Props
export interface RoleTableProps {
  data: RoleItem[];
  onEdit: (record: RoleItem) => void;
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
