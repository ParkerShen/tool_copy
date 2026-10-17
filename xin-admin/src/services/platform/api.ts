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
  id?: number;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: number;
  isAdmin: number;
  roles?: number[];
  roleNames: string[];
  createdAt?: string;
  Roles: any[];
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
export async function getRoleList(params?: {
  name?: string;
  status?: number;
  desciption?: string;
  page?: number;
  pageSize?: number;
}) {
  return request<API.Response<API.RoleItem[]>>('/api/roles', {
    method: 'GET',
    params,
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
  }>('/api/users/', {
    method: 'GET',
    params,
  });
}

// 创建用户
export async function createUser(params: CreateUserParams) {
  return request<any>('/api/users', {
    method: 'POST',
    data: params,
  });
}

export async function uploadsImage(params: any) {
  return request<any>('/api/uploads/uploadimage?category=avatar', {
    method: 'POST',
    data: params,
  });
}

// 更新用户
export async function updateUser(params: UpdateUserParams) {
  return request<any>(`/api/users/${params.id}`, {
    method: 'PUT',
    data: params,
  });
}

// 删除用户
export async function deleteUser(id: number) {
  return request<any>(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

// 获取用户详情
export async function getUserDetail(id: number) {
  return request<any>(`/api/users/${id}`, {
    method: 'GET',
  });
}

// 获取所有角色tree
export async function getAllTreeMenus() {
  return request<API.PermissionTreeResponse>(`/api/roles/getAllmenus`, {
    method: 'GET',
  });
}

// 更新角色
export async function updateRole(params: API.RoleItem) {
  return request<any>(`/api/roles/${params.roleId}`, {
    method: 'PUT',
    data: params,
  });
}

// 创建角色
export async function createRole(params: API.RoleItem) {
  return request<any>(`/api/roles`, {
    method: 'POST',
    data: params,
  });
}

// 删除角色
export async function deleteRole(role_id: number) {
  return request<any>(`/api/roles/${role_id}`, {
    method: 'DELETE',
  });
}


// 获取菜单设置 所有菜单树数据
export async function getPermissionList() {
  return request<API.Response<API.PermissionMenuTree>>('/api/menus/getAllPermissions', {
    method: 'GET',
  });
}

// 创建菜单
export async function createPermission(params: API.PermissionMenu) {
  return request<API.ApiResponse>(`/api/menus`, {
    method: 'POST',
    data: params,
  });
}

// 更新菜单
export async function updatePermission(params: API.PermissionMenu) {
  return request<API.ApiResponse>(`/api/menus/${params.permissionId}`, {
    method: 'PUT',
    data: params,
  });
}

// 删除菜单
export async function deletePermission(permissionId?: number) {
  return request<API.ApiResponse>(`/api/menus/${permissionId}`, {
    method: 'DELETE',
  });
}
