import { apiFetch } from './client';
import type {
  ApiResponse,
  ArticuloTipo,
  BienTipo,
  InteresArticulo,
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

// ===== Admin: solicitudes de la tienda virtual ("me interesa") =====

export interface ListSolicitudesTiendaFilters {
  pendientes?: boolean;
}

export function listSolicitudesTienda(page = 1, filters: ListSolicitudesTiendaFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.pendientes) params.set('pendientes', '1');

  return apiFetch<ApiResponse<PaginatedData<InteresArticulo>>>(`/tienda-solicitudes?${params.toString()}`);
}

export function atenderSolicitudTienda(id: number) {
  return apiFetch<ApiResponse<InteresArticulo>>(`/tienda-solicitudes/${id}/atender`, { method: 'POST' });
}

export function deleteSolicitudTienda(id: number) {
  return apiFetch<ApiResponse<null>>(`/tienda-solicitudes/${id}`, { method: 'DELETE' });
}

// ===== Admin: configurar productos de la tienda (precio, oferta, estado, retirar) =====

export interface ListTiendaProductosFilters {
  tipo?: ArticuloTipo;
}

export function listTiendaProductos(page = 1, filters: ListTiendaProductosFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.tipo) params.set('tipo', filters.tipo);

  return apiFetch<ApiResponse<PaginatedData<TiendaArticulo>>>(`/tienda-productos?${params.toString()}`);
}

export interface UpdateTiendaProductoPayload {
  precio_venta?: string;
  precio_oferta?: string | null;
  estado?: 'disponible_venta' | 'retirado_venta';
}

export function updateTiendaProducto(tipo: ArticuloTipo, id: number, payload: UpdateTiendaProductoPayload) {
  return apiFetch<ApiResponse<TiendaArticulo>>(`/tienda-productos/${tipo}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function retirarTiendaProducto(tipo: ArticuloTipo, id: number) {
  return apiFetch<ApiResponse<TiendaArticulo>>(`/tienda-productos/${tipo}/${id}/retirar`, { method: 'POST' });
}
