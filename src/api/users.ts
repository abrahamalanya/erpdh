import { apiFetch } from './client';
import type { ApiResponse, Estado, PaginatedData, User } from '../types/api';

export interface CreateUserPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  estado?: Estado;
  role: string;
  empresa_id?: number;
  agencia_id?: number;
  supervisor_id?: number;
}

export interface UpdateUserPayload {
  nombre?: string;
  apellido?: string;
  estado?: Estado;
  password?: string;
}

export function listUsers(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<User>>>(`/usuarios?page=${page}`);
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
