import { apiFetch } from './client';
import type { ApiResponse, Billetaje, CanalEgresoBilletaje, MedioEgresoBilletaje, PaginatedData } from '../types/api';
export interface BilletajesFiltros { desde?: string; hasta?: string; agencia_id?: number; asesor_id?: number }
export function listBilletajes(page = 1, filtros: BilletajesFiltros = {}) {
  const params = new URLSearchParams({ page: String(page) });
  for (const [key, value] of Object.entries(filtros)) if (value) params.set(key, String(value));
  return apiFetch<ApiResponse<PaginatedData<Billetaje> & { resumen: { total: string; cantidad: number } }>>('/billetajes?' + params.toString());
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
