import { apiFetch } from './client';
import type { ApiResponse, Bien, BienTipo, PaginatedData } from '../types/api';

export interface CreateBienPayload {
  tipo: BienTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  observacion?: string;
  valorizacion: string;
  cantidad?: number;
  agencia_id?: number;
  foto_cliente_producto?: File | null;
  fotos?: File[];
}

export function listBienes(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Bien>>>(`/bienes?page=${page}`);
}

export function createBien(payload: CreateBienPayload) {
  const formData = new FormData();

  formData.append('tipo', payload.tipo);
  formData.append('nombre', payload.nombre);
  if (payload.marca) formData.append('marca', payload.marca);
  if (payload.modelo) formData.append('modelo', payload.modelo);
  if (payload.serie) formData.append('serie', payload.serie);
  if (payload.observacion) formData.append('observacion', payload.observacion);
  formData.append('valorizacion', payload.valorizacion);
  if (payload.cantidad) formData.append('cantidad', String(payload.cantidad));
  if (payload.agencia_id) formData.append('agencia_id', String(payload.agencia_id));
  if (payload.foto_cliente_producto) {
    formData.append('foto_cliente_producto', payload.foto_cliente_producto);
  }
  (payload.fotos ?? []).forEach((foto) => formData.append('fotos[]', foto));

  return apiFetch<ApiResponse<Bien>>('/bienes', { method: 'POST', body: formData });
}
