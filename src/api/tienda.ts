import { apiFetch } from './client';
import type {
  ApiResponse,
  ArticuloTipo,
  BienTipo,
  PaginatedData,
  TiendaArticulo,
  TiendaBien,
} from '../types/api';

export interface EnviarInteresPayload {
  nombre: string;
  telefono: string;
  email?: string;
  mensaje?: string;
}

// ===== Feed unificado (/tienda/articulos): bienes + vehículos + inmuebles =====

export interface ListTiendaArticulosFilters {
  tipo?: ArticuloTipo;
  empresaId?: number;
  agenciaId?: number;
}

export function listTiendaArticulos(page = 1, filters: ListTiendaArticulosFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.empresaId) params.set('empresa_id', String(filters.empresaId));
  if (filters.agenciaId) params.set('agencia_id', String(filters.agenciaId));

  return apiFetch<ApiResponse<PaginatedData<TiendaArticulo>>>(`/tienda/articulos?${params.toString()}`);
}

export function getTiendaArticulo(tipo: ArticuloTipo, id: number) {
  return apiFetch<ApiResponse<TiendaArticulo>>(`/tienda/articulos/${tipo}/${id}`);
}

export function enviarInteresArticulo(tipo: ArticuloTipo, id: number, payload: EnviarInteresPayload) {
  return apiFetch<ApiResponse<null>>(`/tienda/articulos/${tipo}/${id}/interes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ===== Legacy solo-bienes (/tienda/bienes) — se mantiene por compatibilidad =====

export interface ListTiendaBienesFilters {
  tipo?: BienTipo;
  empresaId?: number;
  agenciaId?: number;
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
