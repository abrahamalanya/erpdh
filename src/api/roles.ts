import { apiFetch } from './client';
import type { ApiResponse, RoleWithPermissions } from '../types/api';

export function listRoles() {
  return apiFetch<ApiResponse<RoleWithPermissions[]>>('/roles');
}

/** modulos es opcional: si se omite, los módulos por defecto del rol quedan sin cambios. */
export function updateRole(id: number, payload: { permissions: string[]; modulos?: string[] }) {
  return apiFetch<ApiResponse<RoleWithPermissions>>(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
