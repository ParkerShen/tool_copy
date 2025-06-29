// src/access.ts

export default function access(initialState: { currentUser?: API.CurrentUser } | undefined) {
  const { currentUser } = initialState ?? {};

  // 1. 提取用户权限集合
  const userPermissions = currentUser?.permissions || [];

  // 2. 创建权限映射对象
  const permissions: Record<string, boolean> = {};
  // 为每个权限标记创建直接访问的属性
  userPermissions.forEach((perm) => {
    permissions[perm] = true;
  });

  // 3. 添加权限检查函数
  const hasPermission = (permission: string) => userPermissions.includes(permission);
  return {
    // 权限检查函数
    hasPermission,
    // 所有权限的布尔映射
    ...permissions,
  };
}
