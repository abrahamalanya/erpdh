import { apiFetch } from './client';
import type { ApiResponse, Caja, CajaCiclo, CajaMovimiento, PaginatedData } from '../types/api';

export interface CajaMovimientoPayload {
  tipo: 'ingreso' | 'egreso';
  concepto_id: number;
  monto: string;
  descripcion?: string;
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
  if (payload.descripcion) formData.append('descripcion', payload.descripcion);
  if (payload.comprobante) formData.append('comprobante', payload.comprobante);
  (payload.fotos_adicionales ?? []).forEach((foto) => formData.append('fotos_adicionales[]', foto));

  return apiFetch<ApiResponse<CajaMovimiento>>('/caja/movimientos', { method: 'POST', body: formData });
}

export interface ListMovimientosCajaFilters {
  page?: number;
  conceptoId?: number;
  /** Solo egresos de desembolso de crédito (credito_id informado); excluyente con `conceptoId`. */
  soloDesembolsos?: boolean;
  /** Excluye los desembolsos de crédito y deja solo egresos manuales. */
  excluirDesembolsos?: boolean;
  /** Usuario que registró el movimiento. */
  registradoPor?: number;
  desde?: string;
  hasta?: string;
}

/**
 * Historial de ingresos/egresos de las cajas que el actor puede ver (la suya
 * si es asesor, las de su agencia o empresa si es administrador), en todos
 * sus ciclos — alimenta los módulos Ingresos, Egresos y Desembolsos.
 */
export function listMovimientosCaja(tipo: 'ingreso' | 'egreso', filters: ListMovimientosCajaFilters = {}) {
  const params = new URLSearchParams({ tipo, page: String(filters.page ?? 1) });
  if (filters.conceptoId) params.set('concepto_id', String(filters.conceptoId));
  if (filters.soloDesembolsos) params.set('solo_desembolsos', '1');
  if (filters.excluirDesembolsos) params.set('excluir_desembolsos', '1');
  if (filters.registradoPor) params.set('registrado_por', String(filters.registradoPor));
  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);

  return apiFetch<ApiResponse<PaginatedData<CajaMovimiento>>>(`/caja/movimientos?${params.toString()}`);
}

/** Usuarios cuyos movimientos puede ver el actor — opciones del filtro "usuario". */
export function listUsuariosMovimientosCaja() {
  return apiFetch<ApiResponse<{ id: number; nombre: string; apellido: string }[]>>('/caja/movimientos/usuarios');
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
