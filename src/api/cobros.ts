import { apiFetch } from './client';
import type { ApiResponse, Cliente, Credito, MedioCobro, PaginatedData, User } from '../types/api';

export type CobroOperacion = 'refrendo' | 'adenda' | 'liquidacion' | 'refinanciamiento' | 'pago_cuota';
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
  desde?: string;
  hasta?: string;
}

export function listCobros(params: ListCobrosParams = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.q) qs.set('q', params.q);
  if (params.operacion) qs.set('operacion', params.operacion);
  if (params.desde) qs.set('desde', params.desde);
  if (params.hasta) qs.set('hasta', params.hasta);

  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  return apiFetch<ApiResponse<PaginatedData<Cobro>>>(`/cobros${suffix}`);
}

/**
 * Créditos con deuda vigente (activo / vencido) del cliente. Cada uno trae
 * `monto_refrendo_sugerido` y `monto_liquidacion_sugerido` ya calculados
 * (igual que el endpoint de detalle del crédito) para prellenar el cobro.
 */
export function getCreditosPendientesCliente(clienteId: number) {
  return apiFetch<ApiResponse<Credito[]>>(`/cobros/creditos-pendientes/${clienteId}`);
}

/** Anula un cobro registrado por error — solo mientras tu ciclo de caja siga abierto. */
export function anularCobro(cobroId: number, motivo?: string) {
  return apiFetch<ApiResponse<Credito>>(`/cobros/${cobroId}/anular`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}
