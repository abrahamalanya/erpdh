import { apiFetch } from './client';
import type { ApiResponse } from '../types/api';

export interface FichaFamiliar {
  id?: number;
  nombres: string;
  edad?: number | string | null;
  parentesco?: string | null;
  estado_civil?: string | null;
  ocupacion?: string | null;
}

/**
 * Ficha socioeconómica del cliente (1:1). Los montos llegan como string
 * (decimal:2) y los totales son de solo lectura, calculados por el backend.
 */
export interface FichaSocioeconomica {
  id: number;
  cliente_id: number;
  grado_instruccion?: string | null;
  profesion?: string | null;
  laboral_institucion?: string | null;
  laboral_cargo?: string | null;
  laboral_fecha_ingreso?: string | null;

  // montos (ing_* / egp_* / egn_* / viv_total_activo_*) — ver utils/fichaSocioeconomica
  [key: string]: unknown;

  viv_tenencia?: string | null;
  viv_material?: string | null;
  viv_habitaciones?: string | null;
  viv_tipo?: string | null;
  viv_nro_pisos?: number | null;
  viv_piso_vive?: number | null;
  viv_agua?: string | null;
  viv_telefono?: string | null;
  viv_redes_servicio?: string[] | null;
  viv_bienes_muebles?: string[] | null;

  declarante_nombres?: string | null;
  declarante_parentesco?: string | null;
  declarante_direccion?: string | null;
  declarante_telefono?: string | null;
  observaciones?: string | null;
  responsable_ficha?: string | null;

  total_ingresos: string;
  total_egresos_personales: string;
  total_egresos_negocio: string;
  total_neto: string;

  familiares?: FichaFamiliar[];
}

export type SaveFichaSocioeconomicaPayload = Record<string, unknown> & {
  familiares?: FichaFamiliar[];
};

export function getFichaSocioeconomica(clienteId: number) {
  return apiFetch<ApiResponse<FichaSocioeconomica | null>>(
    `/clientes/${clienteId}/ficha-socioeconomica`
  );
}

export function saveFichaSocioeconomica(clienteId: number, payload: SaveFichaSocioeconomicaPayload) {
  return apiFetch<ApiResponse<FichaSocioeconomica>>(`/clientes/${clienteId}/ficha-socioeconomica`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
