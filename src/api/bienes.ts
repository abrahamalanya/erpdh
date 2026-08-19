import { apiFetch } from './client';
import type { ApiResponse, Bien, BienTipo, PaginatedData } from '../types/api';

export interface CreateBienPayload {
  cliente_id: number;
  tipo: BienTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  observacion?: string;
  valorizacion: string;
  cantidad?: number;
  foto_cliente_producto?: File | null;
  fotos?: File[];
}

export interface UpdateBienPayload {
  tipo: BienTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  observacion?: string;
  valorizacion: string;
  cantidad?: number;
  foto_cliente_producto?: File | null;
  fotos?: File[];
}

export interface ListBienesFilters {
  clienteId?: number;
  disponibles?: boolean;
}

function toFormData(payload: CreateBienPayload | UpdateBienPayload): FormData {
  const formData = new FormData();

  if ('cliente_id' in payload) formData.append('cliente_id', String(payload.cliente_id));
  formData.append('tipo', payload.tipo);
  formData.append('nombre', payload.nombre);
  if (payload.marca) formData.append('marca', payload.marca);
  if (payload.modelo) formData.append('modelo', payload.modelo);
  if (payload.serie) formData.append('serie', payload.serie);
  if (payload.observacion) formData.append('observacion', payload.observacion);
  formData.append('valorizacion', payload.valorizacion);
  if (payload.cantidad) formData.append('cantidad', String(payload.cantidad));
  if (payload.foto_cliente_producto) {
    formData.append('foto_cliente_producto', payload.foto_cliente_producto);
  }
  (payload.fotos ?? []).forEach((foto) => formData.append('fotos[]', foto));

  return formData;
}

export function listBienes(page = 1, filters: ListBienesFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.clienteId) params.set('cliente_id', String(filters.clienteId));
  if (filters.disponibles) params.set('disponibles', '1');

  return apiFetch<ApiResponse<PaginatedData<Bien>>>(`/bienes?${params.toString()}`);
}

export function createBien(payload: CreateBienPayload) {
  return apiFetch<ApiResponse<Bien>>('/bienes', { method: 'POST', body: toFormData(payload) });
}

export function updateBien(id: number, payload: UpdateBienPayload) {
  const formData = toFormData(payload);
  formData.append('_method', 'PUT');

  return apiFetch<ApiResponse<Bien>>(`/bienes/${id}`, { method: 'POST', body: formData });
}
