import { apiFetch } from './client';
import type { ApiResponse, Banco } from '../types/api';

export interface BancoPayload {
  nombre: string;
  activo?: boolean;
}

export function listBancos() {
  return apiFetch<ApiResponse<Banco[]>>('/bancos');
}

export function createBanco(payload: BancoPayload) {
  return apiFetch<ApiResponse<Banco>>('/bancos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBanco(id: number, payload: Partial<BancoPayload>) {
  return apiFetch<ApiResponse<Banco>>(`/bancos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteBanco(id: number) {
  return apiFetch<ApiResponse<null>>(`/bancos/${id}`, { method: 'DELETE' });
}
