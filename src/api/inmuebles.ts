import { apiFetch } from './client';
import type { ApiResponse, GarantiaEstado, Inmueble, PaginatedData } from '../types/api';

export interface CreateInmueblePayload {
  cliente_id: number;
  partida_registral: string;
  oficina_registral?: string;
  tipo_inmueble?: string;
  direccion: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  area_terreno?: string;
  area_construida?: string;
  propietario: string;
  con_gravamen: boolean;
  linderos?: string;
  observacion?: string;
  valorizacion: string;
  puntaje?: number;
  foto_cliente_producto?: File | null;
  fotos?: File[];
  video?: File | null;
}

export type UpdateInmueblePayload = Omit<CreateInmueblePayload, 'cliente_id'>;

export interface ListInmueblesFilters {
  clienteId?: number;
  disponibles?: boolean;
  /** Free-text search across partida registral, dirección, distrito, provincia, departamento and código (server-side). */
  q?: string;
  tipoInmueble?: string;
  estado?: GarantiaEstado;
  conGravamen?: boolean;
  agenciaId?: number;
}

function toFormData(payload: CreateInmueblePayload | UpdateInmueblePayload): FormData {
  const formData = new FormData();

  if ('cliente_id' in payload) formData.append('cliente_id', String(payload.cliente_id));
  formData.append('partida_registral', payload.partida_registral);
  if (payload.oficina_registral) formData.append('oficina_registral', payload.oficina_registral);
  if (payload.tipo_inmueble) formData.append('tipo_inmueble', payload.tipo_inmueble);
  formData.append('direccion', payload.direccion);
  if (payload.distrito) formData.append('distrito', payload.distrito);
  if (payload.provincia) formData.append('provincia', payload.provincia);
  if (payload.departamento) formData.append('departamento', payload.departamento);
  if (payload.area_terreno) formData.append('area_terreno', payload.area_terreno);
  if (payload.area_construida) formData.append('area_construida', payload.area_construida);
  formData.append('propietario', payload.propietario);
  formData.append('con_gravamen', payload.con_gravamen ? '1' : '0');
  if (payload.linderos) formData.append('linderos', payload.linderos);
  if (payload.observacion) formData.append('observacion', payload.observacion);
  formData.append('valorizacion', payload.valorizacion);
  if (payload.puntaje != null) formData.append('puntaje', String(payload.puntaje));
  if (payload.foto_cliente_producto) {
    formData.append('foto_cliente_producto', payload.foto_cliente_producto);
  }
  if (payload.video) formData.append('video', payload.video);
  (payload.fotos ?? []).forEach((foto) => formData.append('fotos[]', foto));

  return formData;
}

export function listInmuebles(page = 1, filters: ListInmueblesFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.clienteId) params.set('cliente_id', String(filters.clienteId));
  if (filters.disponibles) params.set('disponibles', '1');
  if (filters.q) params.set('q', filters.q);
  if (filters.tipoInmueble) params.set('tipo_inmueble', filters.tipoInmueble);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.conGravamen !== undefined) params.set('con_gravamen', filters.conGravamen ? '1' : '0');
  if (filters.agenciaId) params.set('agencia_id', String(filters.agenciaId));

  return apiFetch<ApiResponse<PaginatedData<Inmueble>>>(`/inmuebles?${params.toString()}`);
}

export function createInmueble(payload: CreateInmueblePayload) {
  return apiFetch<ApiResponse<Inmueble>>('/inmuebles', { method: 'POST', body: toFormData(payload) });
}

export function updateInmueble(id: number, payload: UpdateInmueblePayload) {
  const formData = toFormData(payload);
  formData.append('_method', 'PUT');

  return apiFetch<ApiResponse<Inmueble>>(`/inmuebles/${id}`, { method: 'POST', body: formData });
}
