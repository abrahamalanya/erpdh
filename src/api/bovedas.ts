import { apiFetch } from './client';
import type { ApiResponse, Boveda, BovedaCiclo, BovedaMovimiento, PaginatedData } from '../types/api';

export function listBovedas(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Boveda>>>(`/bovedas?page=${page}`);
}

export function cerrarBoveda(id: number, montoContado: string) {
  return apiFetch<ApiResponse<BovedaCiclo>>(`/bovedas/${id}/cerrar`, {
    method: 'POST',
    body: JSON.stringify({ monto_contado: montoContado }),
  });
}

export function aperturarBoveda(id: number, saldoInicial?: string) {
  return apiFetch<ApiResponse<BovedaCiclo>>(`/bovedas/${id}/aperturar`, {
    method: 'POST',
    body: JSON.stringify(saldoInicial ? { saldo_inicial: saldoInicial } : {}),
  });
}

export function inyectarBoveda(id: number, monto: string, concepto?: string) {
  return apiFetch<ApiResponse<BovedaMovimiento>>(`/bovedas/${id}/inyectar`, {
    method: 'POST',
    body: JSON.stringify(concepto ? { monto, concepto } : { monto }),
  });
}

export function reabrirBoveda(id: number) {
  return apiFetch<ApiResponse<BovedaCiclo>>(`/bovedas/${id}/reabrir`, { method: 'POST' });
}
