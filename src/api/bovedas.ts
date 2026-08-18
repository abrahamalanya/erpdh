import { apiFetch } from './client';
import type { ApiResponse, Boveda, BovedaCiclo, PaginatedData } from '../types/api';

export function listBovedas(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Boveda>>>(`/bovedas?page=${page}`);
}

export function cerrarBoveda(id: number, montoContado: string) {
  return apiFetch<ApiResponse<BovedaCiclo>>(`/bovedas/${id}/cerrar`, {
    method: 'POST',
    body: JSON.stringify({ monto_contado: montoContado }),
  });
}
