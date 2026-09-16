import { apiFetch } from './client';
import type { ApiResponse } from '../types/api';

export interface UbicacionAsesorMapa {
  asesor_id: number;
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
