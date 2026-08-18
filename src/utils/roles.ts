import type { User } from '../types/api';

export function hasRole(user: User | null, ...roles: string[]): boolean {
  if (!user?.roles) return false;
  return user.roles.some((role) => roles.includes(role.name));
}

/**
 * Checks the user's effective permissions (via roles), as returned by
 * /auth/login and /auth/me in `permission_names`. Prefer this over
 * `hasRole` for gating actions — it stays in sync with role/permission
 * changes made from the Roles admin page without a frontend redeploy.
 */
export function hasPermission(user: User | null, ...permissions: string[]): boolean {
  if (!user?.permission_names) return false;
  return user.permission_names.some((permission) => permissions.includes(permission));
}
