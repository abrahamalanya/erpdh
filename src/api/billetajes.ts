import { apiFetch } from './client';
import type { ApiResponse, Billetaje, CanalEgresoBilletaje, MedioEgresoBilletaje, PaginatedData } from '../types/api';
export function listBilletajes(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Billetaje>>>(`/billetajes?page=${page}`);
}
export interface EnviarBilletajePayload {
  asesor_id: number; monto: string; motivo: string; medio_egreso: MedioEgresoBilletaje;
  canal_egreso?: CanalEgresoBilletaje; cuenta_bancaria_id?: number; comprobante?: File | null;
}
export function enviarBilletaje(payload: EnviarBilletajePayload) {
  const body = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) body.append(key, value instanceof File ? value : String(value));
  }
  return apiFetch<ApiResponse<Billetaje>>('/billetajes', { method: 'POST', body });
}
export function aceptarBilletaje(id: number) {
  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/aceptar`, { method: 'POST' });
}
export function rechazarBilletaje(id: number, motivo: string) {
  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/rechazar`, { method: 'POST', body: JSON.stringify({ motivo }) });
}
