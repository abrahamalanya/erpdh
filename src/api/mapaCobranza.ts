import { apiFetch } from './client';
import type { RutaCreditoItem } from './rutasCobranza';
import type { ApiResponse, LugarCobranza } from '../types/api';

/**
 * Un asesor autorizado para el mapa unificado — aparece aunque todavía no
 * haya enviado ningún ping GPS (lat/lng vienen null en ese caso: no hay
 * marcador que dibujar, pero sigue apareciendo en los filtros y aportando
 * su ruta/clientes).
 */
export interface AsesorMapaUnificado {
  asesor_id: number;
  nombre: string;
  apellido: string;
  agencia_id: number | null;
  agencia_nombre: string | null;
  latitud: number | null;
  longitud: number | null;
  precision_metros: number | null;
  capturado_en: string | null;
  /** Backend ya decide esto según `config('mapa_cobranza.minutos_ubicacion_desactualizada')` — nunca se recalcula en el cliente. Siempre true si nunca envió un ping. */
  desactualizado: boolean;
}

/** Estado de permanencia tal como lo persistió VisitaClienteService — nunca calculado en el frontend. */
export interface PermanenciaMapaUnificado {
  inicio_en: string | null;
  ultima_lectura_en: string | null;
  confirmada_en: string | null;
}

/** Un cliente de la ruta de hoy de algún asesor visible, con su semáforo de visita ya resuelto por el backend. */
export interface ClienteMapaUnificado {
  cliente_id: number;
  asesor_id: number;
  orden: number;
  nombre: string;
  apellido: string;
  numero_documento: string | null;
  lugar_cobranza: LugarCobranza;
  direccion_cobranza: string | null;
  referencia_cobranza: string | null;
  latitud_cobranza: number | null;
  longitud_cobranza: number | null;
  cobrado_hoy: boolean;
  /** 'verde' tiene prioridad sobre 'amarillo' — ya resuelto en el backend. */
  estado_visual: 'pendiente' | 'amarillo' | 'verde';
  permanencia: PermanenciaMapaUnificado;
  dias_atraso_max: number;
  creditos_vencidos: number;
  credito_codigos: string[];
  creditos: RutaCreditoItem[];
}

export interface MapaUnificadoResponse {
  asesores: AsesorMapaUnificado[];
  clientes: ClienteMapaUnificado[];
  radio_proximidad_metros: number;
  minutos_permanencia: number;
}

/** Mapa unificado (asesores en vivo + ruta de cobranza + estado de visita) visible para el actor, acotado opcionalmente por agencia/asesor. */
export function getMapaCobranzaUnificado(agenciaId?: number, asesorId?: number) {
  const params = new URLSearchParams();
  if (agenciaId) params.set('agencia_id', String(agenciaId));
  if (asesorId) params.set('asesor_id', String(asesorId));

  const query = params.toString();
  return apiFetch<ApiResponse<MapaUnificadoResponse>>(`/dashboard/mapa-unificado${query ? `?${query}` : ''}`);
}
