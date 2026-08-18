import { apiFetch } from './client';
import type { ApiResponse, Permission } from '../types/api';

export function listPermissions() {
  return apiFetch<ApiResponse<Permission[]>>('/permisos');
}
