import { apiFetch } from './client';
import type { ApiResponse, PaginatedData, PermisoTemporalCliente } from '../types/api';

export type EstadoPermisoTemporal = 'todos' | 'vigente' | 'expirado' | 'revocado';

export interface ListPermisosTemporalesParams {
  page?: number;
  estado?: EstadoPermisoTemporal;
  perPage?: number;
}

export function listPermisosTemporales(params: ListPermisosTemporalesParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.estado) query.set('estado', params.estado);
  if (params.perPage) query.set('per_page', String(params.perPage));

  const suffix = query.toString();
  return apiFetch<ApiResponse<PaginatedData<PermisoTemporalCliente>>>(
    `/gestion/permisos-temporales${suffix ? `?${suffix}` : ''}`
  );
}

export function concederPermisoTemporalCliente(clienteId: number, motivo: string) {
  return apiFetch<ApiResponse<PermisoTemporalCliente>>(`/gestion/permisos-temporales/${clienteId}`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export function revocarPermisoTemporalCliente(permisoId: number, motivo: string) {
  return apiFetch<ApiResponse<PermisoTemporalCliente>>(`/gestion/permisos-temporales/${permisoId}`, {
    method: 'DELETE',
    body: JSON.stringify({ motivo }),
  });
}
