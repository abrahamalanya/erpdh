import { apiFetch } from './client';
import type {
  ApiResponse,
  PlanillaDescuento,
  PlanillaDescuentoEstado,
  PlanillaDescuentoTipo,
  PlanillaDetalle,
  PlanillaResumen,
} from '../types/api';

/** El alcance (empresa / agencia del actor) lo filtra el backend. */
export function listPlanillas(periodo?: string) {
  const query = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
  return apiFetch<ApiResponse<PlanillaResumen[]>>(`/planillas${query}`);
}

export interface CreatePlanillaPayload {
  /** YYYY-MM */
  periodo: string;
  fecha_pago: string;
  agencia_id?: number;
}

/** Idempotente: si ya existe la planilla del periodo/agencia, la devuelve ("abrir planilla del mes"). */
export function createPlanilla(payload: CreatePlanillaPayload) {
  return apiFetch<ApiResponse<PlanillaResumen>>('/planillas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPlanilla(id: number) {
  return apiFetch<ApiResponse<PlanillaDetalle>>(`/planillas/${id}`);
}

export interface PlanillaLineaPayload {
  user_id: number;
  /** Sueldo base. */
  ingresos: string;
  /** Se suman al ingreso pero no a la base de aportes del trabajador. */
  bonificaciones?: string;
  situacion?: string;
  /** true → `afp` se digita a mano; false → ONP por tasa configurada. */
  es_afp?: boolean;
  afp?: string;
  descuentos_devengado?: string;
}

/** Upsert por user_id; devuelve el detalle completo recalculado. Solo en borrador. */
export function guardarLineasPlanilla(id: number, lineas: PlanillaLineaPayload[]) {
  return apiFetch<ApiResponse<PlanillaDetalle>>(`/planillas/${id}/lineas`, {
    method: 'POST',
    body: JSON.stringify({ lineas }),
  });
}

/** Confirma la planilla: congela totales y consume los descuentos. */
export function cerrarPlanilla(id: number) {
  return apiFetch<ApiResponse<PlanillaDetalle>>(`/planillas/${id}/cerrar`, { method: 'POST' });
}

/** Vuelve a borrador y devuelve los descuentos consumidos. */
export function reabrirPlanilla(id: number) {
  return apiFetch<ApiResponse<PlanillaDetalle>>(`/planillas/${id}/reabrir`, { method: 'POST' });
}

export const PLANILLA_DESCUENTO_TIPOS: { value: PlanillaDescuentoTipo; label: string }[] = [
  { value: 'adelanto', label: 'Adelanto de sueldo' },
  { value: 'prestamo', label: 'Préstamo al trabajador' },
  { value: 'falta', label: 'Falta' },
  { value: 'riesgo_caja', label: 'Riesgo de caja' },
  { value: 'otro', label: 'Otro descuento' },
];

export function listPlanillaDescuentos(filters: { user_id?: number; estado?: PlanillaDescuentoEstado } = {}) {
  const params = new URLSearchParams();
  if (filters.user_id) params.set('user_id', String(filters.user_id));
  if (filters.estado) params.set('estado', filters.estado);
  const query = params.toString();

  return apiFetch<ApiResponse<PlanillaDescuento[]>>(`/planilla-descuentos${query ? `?${query}` : ''}`);
}

export interface CreatePlanillaDescuentoPayload {
  user_id: number;
  tipo: PlanillaDescuentoTipo;
  concepto: string;
  monto: string;
  /** Monto mensual (≤ monto); null = todo de una vez. */
  cuota: string | null;
  fecha_registro: string;
  agencia_id?: number;
}

export function createPlanillaDescuento(payload: CreatePlanillaDescuentoPayload) {
  return apiFetch<ApiResponse<PlanillaDescuento>>('/planilla-descuentos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** 422 si ya está saldado. */
export function anularPlanillaDescuento(id: number) {
  return apiFetch<ApiResponse<PlanillaDescuento>>(`/planilla-descuentos/${id}/anular`, { method: 'POST' });
}
