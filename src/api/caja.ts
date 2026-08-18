import { apiFetch } from './client';
import type { ApiResponse, Caja, CajaCiclo, PaginatedData } from '../types/api';

export function getMiCaja() {
  return apiFetch<ApiResponse<Caja>>('/caja');
}

export function aperturarCaja() {
  return apiFetch<ApiResponse<CajaCiclo>>('/caja/aperturar', { method: 'POST' });
}

export function cerrarCaja(montoContado: string) {
  return apiFetch<ApiResponse<CajaCiclo>>('/caja/cerrar', {
    method: 'POST',
    body: JSON.stringify({ monto_contado: montoContado }),
  });
}

export function listCajas(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Caja>>>(`/cajas?page=${page}`);
}

export function cerrarForzadoCaja(id: number, montoContado: string) {
  return apiFetch<ApiResponse<CajaCiclo>>(`/cajas/${id}/cerrar-forzado`, {
    method: 'POST',
    body: JSON.stringify({ monto_contado: montoContado }),
  });
}
