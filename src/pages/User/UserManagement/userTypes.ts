// src/pages/UserManagement/types.ts
// 用户数据类型定义
export interface UserItem {
    id: string;
    name: string;
    email: string;
    createdAt?: string;
    updatedAt?: string;
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
  }
  
  // 表格组件Props
  export interface UserTableProps {
    data: UserItem[];
    onEdit: (record: UserItem) => void;
    onDelete: (id: string) => void;
    onCreate: () => void;
  }