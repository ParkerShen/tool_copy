// @ts-ignore
/* eslint-disable */

declare namespace API {
  // 通用 API 响应接口
  interface ApiResponse<T> {
    success: boolean; // 请求是否成功
    message: string; // 消息描述
    data: T; // 泛型数据
  }

  // 权限树节点接口
  export interface PermissionTreeNode {
    title: string; // 节点标题
    key: string; // 节点唯一标识
    children?: PermissionTreeNode[]; // 子节点（可选）
  }

  type PermissionTreeResponse = ApiResponse<PermissionTreeNode[]>;

  type CurrentUser = {
    name?: string;
    avatar?: string;
    userid?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
    permissions: string[];
  };

  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  type RuleListItem = {
    key?: number;
    disabled?: boolean;
    href?: string;
    avatar?: string;
    name?: string;
    owner?: string;
    desc?: string;
    callNo?: number;
    status?: number;
    updatedAt?: string;
    createdAt?: string;
    progress?: number;
  };

  type RuleList = {
    data?: RuleListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type FakeCaptcha = {
    code?: number;
    status?: string;
  };

  type LoginParams = {
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
  };

  type ErrorResponse = {
    /** 业务约定的错误码 */
    errorCode: string;
    /** 业务上的错误信息 */
    errorMessage?: string;
    /** 业务上的请求是否成功 */
    success?: boolean;
  };

  type NoticeIconList = {
    data?: NoticeIconItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type NoticeIconItemType = 'notification' | 'message' | 'event';

  type NoticeIconItem = {
    id?: string;
    extra?: string;
    key?: string;
    read?: boolean;
    avatar?: string;
    title?: string;
    status?: string;
    datetime?: string;
    description?: string;
    type?: NoticeIconItemType;
  };

  // 角色类型
  type RoleItem = {
    /*
    角色id
    */
    roleId?: number;
    /*
    角色名称
    */
    name?: string;
    /*
    启用状态 0 禁用  1 启用
    */
    status?: number;
    /*
    描述
    */
    description?: string;
    /*
    创建时间
    */
    cTime?: string;
    /*
    权限数组
    */
    permissions?: string[];
    /*
    权限数组
    */
    accesss?: string[];
  };

  type RoleListeResponse = ApiResponse<RoleItem[]>;

  type Response<T> = {
    current: number;
    pageSize: number;
    total: number;
    success: boolean;
    data?: T;
    message?: string;
  };
}
