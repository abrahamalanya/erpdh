import { apiFetch } from './client';
import type { ApiResponse, ConsultaDniResult, Estado, PaginatedData, User } from '../types/api';

export interface CreateUserPayload {
  nombre: string;
  apellido: string;
  dni: string;
  usuario?: string;
  telefono?: string;
  email?: string;
  password?: string;
  estado?: Estado;
  roles: string[];
  empresa_id?: number;
  agencia_id?: number;
  supervisor_id?: number;
}

export interface UpdateUserPayload {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  estado?: Estado;
  password?: string;
  roles?: string[];
  /** Required by the backend when the resulting roles include an agencia-level one and the user has no agencia yet. */
  agencia_id?: number;
}

export interface ListUsersFilters {
  nombre?: string;
  dni?: string;
  estado?: string;
  role?: string;
  agencia_id?: number;
  empresa_id?: number;
}

export function listUsers(page = 1, filters: ListUsersFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.nombre) params.set('nombre', filters.nombre);
  if (filters.dni) params.set('dni', filters.dni);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.role) params.set('role', filters.role);
  if (filters.agencia_id) params.set('agencia_id', String(filters.agencia_id));
  if (filters.empresa_id) params.set('empresa_id', String(filters.empresa_id));

  return apiFetch<ApiResponse<PaginatedData<User>>>(`/usuarios?${params.toString()}`);
}

export function createUser(payload: CreateUserPayload) {
  return apiFetch<ApiResponse<User>>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: number, payload: UpdateUserPayload) {
  return apiFetch<ApiResponse<User>>(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: number) {
  return apiFetch<ApiResponse<null>>(`/usuarios/${id}`, { method: 'DELETE' });
}

export function consultarDni(dni: string) {
  return apiFetch<ApiResponse<ConsultaDniResult>>(`/usuarios/consultar-dni/${dni}`);
}

/** Roles the authenticated user is allowed to assign, resolved by the backend hierarchy. */
export function listRolesAsignables() {
  return apiFetch<ApiResponse<string[]>>('/usuarios/roles-asignables');
}
