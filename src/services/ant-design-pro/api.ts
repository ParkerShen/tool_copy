// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/currentUser */
export async function currentUser(options?: { [key: string]: any }) {
  return request<{
    data: API.CurrentUser;
  }>('/api/users/currentUser', {
    method: 'GET',
    ...(options || {}),
  });
}

// 当前用户权限
export async function fetchUserPermission(options?: { [key: string]: any }) {
  return request<{
    data: API.CurrentUser;
  }>('/api/users/currentPermission', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 退出登录接口 POST /api/login/outLogin */
export async function outLogin(options?: { [key: string]: any }) {
  return request<Record<string, any>>('/api/users/logout', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 登录接口 POST /api/login/account */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>('/api/users/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

// 用户数据类型
export interface UserItem {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;
  isAdmin: number;
  roles: number[];
  roleNames: string[];
  createdAt: string;
}

// 创建用户参数
export interface CreateUserParams {
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  isAdmin?: number;
  roles?: number[];
  status?: number;
  avatar?: string;
}

/** 获取角色列表 GET /api/role/list */
export async function getRoleList(options?: { [key: string]: any }) {
  return request<API.Response<{ data: API.RoleItem[] }>>('/api/roles/getAllroles', {
    method: 'GET',
    ...(options || {}),
  });
}

// 角色数据类型
export interface RoleItem {
  roleId: number;
  name: string;
  label: string;
}

// 更新用户参数
export interface UpdateUserParams extends CreateUserParams {
  id: number;
}

// 获取用户列表
export async function getUsers(params?: {
  username?: string;
  status?: number;
  isAdmin?: number;
  page?: number;
  pageSize?: number;
}) {
  return request<{ 
    success: boolean; 
    data: UserItem[]; 
    count: number;
    current: number;
    pageSize: number;
    message?: string;
  }>('/api/users/getUsers', {
    method: 'GET',
    params
  });
}

// 创建用户
export async function createUser(params: CreateUserParams) {
  return request<any>('/api/users', {
    method: 'POST',
    data: params
  });
}

export async function uploadsImage(params: any) {
  return request<any>('/api/uploads/uploadimage?category=avatar', {
    method: 'POST',
    data: params
  });
}

// 更新用户
export async function updateUser(params: UpdateUserParams) {
  return request<any>(`/api/users/${params.id}`, {
    method: 'PUT',
    data: params
  });
}

// 删除用户
export async function deleteUser(id: number) {
  return request<any>(`/api/users/${id}`, {
    method: 'DELETE'
  });
}

// 获取用户详情
export async function getUserDetail(id: number) {
  return request<any>(`/api/users/${id}`, {
    method: 'GET'
  });
}

// /** 此处后端没有提供注释 GET /api/notices */
// export async function getNotices(options?: { [key: string]: any }) {
//   return request<API.NoticeIconList>('/api/notices', {
//     method: 'GET',
//     ...(options || {}),
//   });
// }

// /** 获取规则列表 GET /api/rule */
// export async function rule(
//   params: {
//     // query
//     /** 当前的页码 */
//     current?: number;
//     /** 页面的容量 */
//     pageSize?: number;
//   },
//   options?: { [key: string]: any },
// ) {
//   return request<API.RuleList>('/api/rule', {
//     method: 'GET',
//     params: {
//       ...params,
//     },
//     ...(options || {}),
//   });
// }

// /** 更新规则 PUT /api/rule */
// export async function updateRule(options?: { [key: string]: any }) {
//   return request<API.RuleListItem>('/api/rule', {
//     method: 'POST',
//     data: {
//       method: 'update',
//       ...(options || {}),
//     },
//   });
// }

// /** 新建规则 POST /api/rule */
// export async function addRule(options?: { [key: string]: any }) {
//   return request<API.RuleListItem>('/api/rule', {
//     method: 'POST',
//     data: {
//       method: 'post',
//       ...(options || {}),
//     },
//   });
// }

// /** 删除规则 DELETE /api/rule */
// export async function removeRule(options?: { [key: string]: any }) {
//   return request<Record<string, any>>('/api/rule', {
//     method: 'POST',
//     data: {
//       method: 'delete',
//       ...(options || {}),
//     },
//   });
// }
