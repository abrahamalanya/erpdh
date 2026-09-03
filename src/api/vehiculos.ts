import { apiFetch } from './client';
import type { ApiResponse, PaginatedData, Vehiculo } from '../types/api';

export interface CreateVehiculoPayload {
  cliente_id: number;
  placa: string;
  motor: string;
  serie: string;
  color: string;
  marca: string;
  modelo?: string;
  anio?: number;
  clase?: string;
  propietario: string;
  tiene_soat: boolean;
  observacion?: string;
  valorizacion: string;
  puntaje?: number;
  foto_cliente_producto?: File | null;
  fotos?: File[];
  video?: File | null;
}

export type UpdateVehiculoPayload = Omit<CreateVehiculoPayload, 'cliente_id'>;

export interface ListVehiculosFilters {
  clienteId?: number;
  disponibles?: boolean;
}

function toFormData(payload: CreateVehiculoPayload | UpdateVehiculoPayload): FormData {
  const formData = new FormData();

  if ('cliente_id' in payload) formData.append('cliente_id', String(payload.cliente_id));
  formData.append('placa', payload.placa);
  formData.append('motor', payload.motor);
  formData.append('serie', payload.serie);
  formData.append('color', payload.color);
  formData.append('marca', payload.marca);
  if (payload.modelo) formData.append('modelo', payload.modelo);
  if (payload.anio != null) formData.append('anio', String(payload.anio));
  if (payload.clase) formData.append('clase', payload.clase);
  formData.append('propietario', payload.propietario);
  formData.append('tiene_soat', payload.tiene_soat ? '1' : '0');
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

export function listVehiculos(page = 1, filters: ListVehiculosFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.clienteId) params.set('cliente_id', String(filters.clienteId));
  if (filters.disponibles) params.set('disponibles', '1');

  return apiFetch<ApiResponse<PaginatedData<Vehiculo>>>(`/vehiculos?${params.toString()}`);
}

export function createVehiculo(payload: CreateVehiculoPayload) {
  return apiFetch<ApiResponse<Vehiculo>>('/vehiculos', { method: 'POST', body: toFormData(payload) });
}

export function updateVehiculo(id: number, payload: UpdateVehiculoPayload) {
  const formData = toFormData(payload);
  formData.append('_method', 'PUT');

  return apiFetch<ApiResponse<Vehiculo>>(`/vehiculos/${id}`, { method: 'POST', body: formData });
}
