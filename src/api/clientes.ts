import { apiFetch } from './client';
import type { ApiResponse, Cliente, ConsultaDniResult, Estado, PaginatedData, TipoDocumento } from '../types/api';

export interface CreateClientePayload {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono?: string;
  direccion?: string;
  referencia?: string;
  empresa_id?: number;
  agencia_id?: number;
  foto_cliente?: File | null;
  foto_dni?: File | null;
  foto_casa?: File | null;
  foto_negocio?: File | null;
}

export interface UpdateClientePayload {
  nombre?: string;
  apellido?: string;
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
  telefono?: string;
  direccion?: string;
  referencia?: string;
  estado?: Estado;
  foto_cliente?: File | null;
  foto_dni?: File | null;
  foto_casa?: File | null;
  foto_negocio?: File | null;
}

function toFormData(payload: object): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    formData.append(key, value instanceof File ? value : String(value));
  }

  return formData;
}

export function listClientes(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Cliente>>>(`/clientes?page=${page}`);
}

export function createCliente(payload: CreateClientePayload) {
  return apiFetch<ApiResponse<Cliente>>('/clientes', {
    method: 'POST',
    body: toFormData(payload),
  });
}

export function updateCliente(id: number, payload: UpdateClientePayload) {
  const formData = toFormData(payload);
  formData.append('_method', 'PUT');

  return apiFetch<ApiResponse<Cliente>>(`/clientes/${id}`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteCliente(id: number) {
  return apiFetch<ApiResponse<null>>(`/clientes/${id}`, { method: 'DELETE' });
}

export function consultarDni(dni: string) {
  return apiFetch<ApiResponse<ConsultaDniResult>>(`/clientes/consultar-dni/${dni}`);
}

export function asignarCliente(id: number, asesorId: number) {
  return apiFetch<ApiResponse<Cliente>>(`/clientes/${id}/asignar`, {
    method: 'POST',
    body: JSON.stringify({ asesor_id: asesorId }),
  });
}
