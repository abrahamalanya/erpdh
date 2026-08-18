import { apiFetch } from './client';
import type { Agencia, ApiResponse, Estado, PaginatedData } from '../types/api';

export interface AgenciaPayload {
  nombre: string;
  estado?: Estado;
  empresa_id?: number;
}

export function listAgencias(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Agencia>>>(`/agencias?page=${page}`);
}

export function createAgencia(payload: AgenciaPayload) {
  return apiFetch<ApiResponse<Agencia>>('/agencias', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAgencia(id: number, payload: Partial<AgenciaPayload>) {
  return apiFetch<ApiResponse<Agencia>>(`/agencias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteAgencia(id: number) {
  return apiFetch<ApiResponse<null>>(`/agencias/${id}`, { method: 'DELETE' });
}
