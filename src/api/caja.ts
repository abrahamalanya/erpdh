import { apiFetch } from './client';
import type { ApiResponse, Caja, CajaCiclo, CajaMovimiento, PaginatedData } from '../types/api';

export interface CajaMovimientoPayload {
  tipo: 'ingreso' | 'egreso';
  concepto_id: number;
  monto: string;
  comprobante?: File | null;
  fotos_adicionales?: File[];
}

export function getMiCaja() {
  return apiFetch<ApiResponse<Caja>>('/caja');
}

export function getResumenCierre() {
  return apiFetch<ApiResponse<CajaCiclo>>('/caja/cierre/resumen');
}

export function registrarMovimientoCaja(payload: CajaMovimientoPayload) {
  const formData = new FormData();
  formData.append('tipo', payload.tipo);
  formData.append('concepto_id', String(payload.concepto_id));
  formData.append('monto', payload.monto);
  if (payload.comprobante) formData.append('comprobante', payload.comprobante);
  (payload.fotos_adicionales ?? []).forEach((foto) => formData.append('fotos_adicionales[]', foto));

  return apiFetch<ApiResponse<CajaMovimiento>>('/caja/movimientos', { method: 'POST', body: formData });
}

/** Full ingreso/gasto history for the actor's own caja, across every ciclo — powers the Ingresos/Gastos modules. */
export function listMovimientosCaja(tipo: 'ingreso' | 'egreso', page = 1) {
  return apiFetch<ApiResponse<PaginatedData<CajaMovimiento>>>(`/caja/movimientos?tipo=${tipo}&page=${page}`);
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

export function reabrirCaja(id: number) {
  return apiFetch<ApiResponse<CajaCiclo>>(`/cajas/${id}/reabrir`, { method: 'POST' });
}
