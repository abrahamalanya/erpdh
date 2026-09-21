import { apiFetch, apiFetchBlob } from './client';
import type { ApiResponse, Cliente, Credito, MedioCobro, PaginatedData, User } from '../types/api';

export type CobroOperacion = 'refrendo' | 'adenda' | 'liquidacion' | 'refinanciamiento' | 'pago_cuota' | 'pago_cuotas_diario';
export type CobroEstado = 'registrado' | 'anulado';

/**
 * Un cobro registrado sobre un crédito. Lo crea el backend al recibir un
 * pago (refrendo / adenda / liquidación / pago de cuota / refinanciamiento);
 * el módulo Cobranzas lo lista y permite anularlo (ver `anularCobro()`)
 * mientras el ciclo de caja donde se cobró siga abierto — `puede_anular` ya
 * viene resuelto desde el backend, no hace falta re-derivar la regla acá.
 */
export interface Cobro {
  id: number;
  empresa_id: number;
  cliente_id: number;
  credito_id: number;
  credito_sucesor_id?: number | null;
  caja_ciclo_id?: number | null;
  caja_movimiento_id?: number | null;
  /** Número cuando la relación no viene cargada; objeto User cuando sí (`with('registradoPor')`). */
  registrado_por?: number | User | null;
  operacion: CobroOperacion;
  estado: CobroEstado;
  credito_estado_anterior?: string | null;
  monto_pagado: string;
  medio: MedioCobro;
  interes: string;
  mora?: string | null;
  descuento?: string | null;
  motivo_descuento?: string | null;
  vuelto: string;
  anulado_por?: number | User | null;
  anulado_at?: string | null;
  motivo_anulacion?: string | null;
  puede_anular?: boolean;
  created_at: string;
  cliente?: Cliente;
  credito?: Credito;
}

export interface ListCobrosParams {
  page?: number;
  q?: string;
  operacion?: CobroOperacion;
  estado?: CobroEstado;
  /** Filtra por el asesor que registró el cobro (Cobro.registrado_por), no por quién lo anuló. */
  registrado_por?: number;
  desde?: string;
  hasta?: string;
  /** Distinto de desde/hasta (fecha del cobro original) — rango sobre anulado_at, para el reporte de anulaciones. */
  anulado_desde?: string;
  anulado_hasta?: string;
}

function cobrosQuery(params: ListCobrosParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.q) qs.set('q', params.q);
  if (params.operacion) qs.set('operacion', params.operacion);
  if (params.estado) qs.set('estado', params.estado);
  if (params.registrado_por) qs.set('registrado_por', String(params.registrado_por));
  if (params.desde) qs.set('desde', params.desde);
  if (params.hasta) qs.set('hasta', params.hasta);
  if (params.anulado_desde) qs.set('anulado_desde', params.anulado_desde);
  if (params.anulado_hasta) qs.set('anulado_hasta', params.anulado_hasta);

  const suffix = qs.toString();

  return suffix ? `?${suffix}` : '';
}

export function listCobros(params: ListCobrosParams = {}) {
  return apiFetch<ApiResponse<PaginatedData<Cobro>>>(`/cobros${cobrosQuery(params)}`);
}

/** Sin `page` — trae todas las filas que calcen los filtros dados. */
export function getCobrosPdf(params: Omit<ListCobrosParams, 'page'> = {}) {
  return apiFetchBlob(`/cobros/pdf${cobrosQuery(params)}`);
}

export function getCobrosExcel(params: Omit<ListCobrosParams, 'page'> = {}) {
  return apiFetchBlob(`/cobros/excel${cobrosQuery(params)}`);
}

/**
 * Créditos con deuda vigente (activo / vencido) del cliente. Cada uno trae
 * `monto_refrendo_sugerido` y `monto_liquidacion_sugerido` ya calculados
 * (igual que el endpoint de detalle del crédito) para prellenar el cobro.
 */
export function getCreditosPendientesCliente(clienteId: number) {
  return apiFetch<ApiResponse<Credito[]>>(`/cobros/creditos-pendientes/${clienteId}`);
}

/** Voucher en PDF del cobro, generado por el backend — ver VoucherCobroDialog. */
export function getCobroVoucherBlob(cobroId: number) {
  return apiFetchBlob(`/cobros/${cobroId}/voucher`);
}

/** Texto plano del voucher, armado por el backend, para compartirlo (WhatsApp). */
export function getCobroVoucherTexto(cobroId: number) {
  return apiFetch<ApiResponse<{ texto: string }>>(`/cobros/${cobroId}/voucher/texto`);
}

/** Anula un cobro registrado por error — solo mientras tu ciclo de caja siga abierto. */
export function anularCobro(cobroId: number, motivo?: string) {
  return apiFetch<ApiResponse<Credito>>(`/cobros/${cobroId}/anular`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}
