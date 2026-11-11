import { apiFetch } from './client';
import type { ApiResponse, MedioCobro } from '../types/api';
import type { CobroOperacion } from './cobros';

export interface UbicacionAsesorMapa {
  asesor_id: number;
  dispositivo_id: number | null;
  sesion_activa?: boolean;
  nombre: string;
  apellido: string;
  latitud: number;
  longitud: number;
  precision_metros: number | null;
  capturado_en: string;
}

/** Últimas ubicaciones de los asesores visibles para el actor. */
export function getUbicacionesAsesores() {
  return apiFetch<ApiResponse<UbicacionAsesorMapa[]>>('/ubicaciones-asesores');
}

export interface AsesorUbicacion {
  id: number;
  nombre: string;
  apellido: string;
  agencia_id: number | null;
  agencia_nombre: string | null;
}

/** Asesores cuyo historial de recorridos puede consultar el actor — para el selector del reporte. */
export function getAsesoresVisiblesUbicacion() {
  return apiFetch<ApiResponse<AsesorUbicacion[]>>('/ubicaciones-asesores/asesores-visibles');
}

export interface HistorialPunto {
  dispositivo_id: number | null;
  latitud: number;
  longitud: number;
  precision_metros: number | null;
  velocidad_ms: number | null;
  capturado_en: string;
}

export interface HistorialPausa {
  desde: string;
  hasta: string;
  duracion_min: number;
}

export interface HistorialResumen {
  inicio: string | null;
  fin: string | null;
  distancia_m: number;
  pausas: HistorialPausa[];
}

export interface HistorialCobroCliente {
  id: number;
  nombre: string;
  apellido: string;
  numero_documento: string;
}

export interface HistorialCobroCredito {
  id: number;
  codigo: string;
  tipo_credito: string;
  numero_cuotas: number | null;
  estado: string;
  monto_prestamo: string;
}

export interface HistorialCobroCuota {
  numero_cuota: number | null;
  /** Presente cuando la cuota se pagó completa de un crédito compuesto (cuotasPagadas). */
  monto_total?: string;
  /** Presente cuando el abono viene de un crédito diario (abonosCuotas). */
  monto_cuota?: string;
  monto_mora?: string;
  completa: boolean;
}

/** Un cobro que el asesor registró ese día, con el detalle del crédito y de las cuotas que tocó. */
export interface HistorialCobro {
  id: number;
  created_at: string;
  operacion: CobroOperacion;
  medio: MedioCobro;
  monto_pagado: string;
  interes: string;
  mora: string | null;
  descuento: string | null;
  vuelto: string;
  cliente: HistorialCobroCliente | null;
  credito: HistorialCobroCredito | null;
  cuotas: HistorialCobroCuota[];
}

export interface HistorialAsesor {
  recorridos: HistorialRecorrido[];
  puntos: HistorialPunto[];
  resumen: HistorialResumen;
  /** Clientes que el asesor cobró ese mismo día, para la sección "Clientes cobrados" del reporte. */
  cobros: HistorialCobro[];
}

/** Historial de recorrido de un asesor entre `desde` y `hasta` (YYYY-MM-DD, ambas inclusive). */
export function getHistorialAsesor(asesorId: number, fecha: string) {
  const params = new URLSearchParams({ asesor_id: String(asesorId), fecha });

  return apiFetch<ApiResponse<HistorialAsesor>>(`/ubicaciones-asesores/historial?${params.toString()}`);
}

export interface HistorialRecorrido {
  dispositivo_id: number | null;
  puntos: Pick<HistorialPunto, 'latitud' | 'longitud' | 'capturado_en'>[];
  trazado: [number, number][];
  aproximado: boolean;
}
