import { apiFetch } from './client';
import type { ApiResponse, BienTipo, PaginatedData, TiendaBien } from '../types/api';

export interface ListTiendaBienesFilters {
  tipo?: BienTipo;
  empresaId?: number;
  agenciaId?: number;
}

export interface EnviarInteresPayload {
  nombre: string;
  telefono: string;
  email?: string;
  mensaje?: string;
}

export function listTiendaBienes(page = 1, filters: ListTiendaBienesFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.empresaId) params.set('empresa_id', String(filters.empresaId));
  if (filters.agenciaId) params.set('agencia_id', String(filters.agenciaId));

  return apiFetch<ApiResponse<PaginatedData<TiendaBien>>>(`/tienda/bienes?${params.toString()}`);
}

export function getTiendaBien(id: number) {
  return apiFetch<ApiResponse<TiendaBien>>(`/tienda/bienes/${id}`);
}

export function enviarInteres(bienId: number, payload: EnviarInteresPayload) {
  return apiFetch<ApiResponse<null>>(`/tienda/bienes/${bienId}/interes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
