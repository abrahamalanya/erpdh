import { apiFetch } from './client';
import type { ApiResponse, Billetaje, PaginatedData } from '../types/api';

export function listBilletajes(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Billetaje>>>(`/billetajes?page=${page}`);
}

export function solicitarBilletaje(monto: string) {
  return apiFetch<ApiResponse<Billetaje>>('/billetajes', {
    method: 'POST',
    body: JSON.stringify({ monto }),
  });
}

export function aprobarBilletaje(id: number) {
  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/aprobar`, { method: 'POST' });
}

export function rechazarBilletaje(id: number, motivo?: string) {
  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}
