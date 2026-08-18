import { apiFetch } from './client';
import type { ApiResponse, RoleWithPermissions } from '../types/api';

export function listRoles() {
  return apiFetch<ApiResponse<RoleWithPermissions[]>>('/roles');
}

export function updateRolePermissions(id: number, permissions: string[]) {
  return apiFetch<ApiResponse<RoleWithPermissions>>(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}
