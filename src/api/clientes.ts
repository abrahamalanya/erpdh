import { apiFetch } from './client';
import type { ApiResponse, Cliente, ConsultaDniResult, Estado, PaginatedData, TipoDocumento } from '../types/api';

interface ClienteIdentidadFields {
  fecha_nacimiento?: string;
  sexo?: 'm' | 'f';
  estado_civil?: string;
  email?: string;
}

/** Dirección de casa o de negocio — mismo shape para ambas. */
interface ClienteDireccionFields {
  direccion?: string;
  ubigeo_distrito_id?: number;
  referencia?: string;
  latitud?: number;
  longitud?: number;
}

export interface CreateClientePayload extends ClienteIdentidadFields, ClienteDireccionFields {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  telefono?: string;
  direccion_negocio?: string;
  ubigeo_distrito_negocio_id?: number;
  referencia_negocio?: string;
  latitud_negocio?: number;
  longitud_negocio?: number;
  empresa_id?: number;
  agencia_id?: number;
  foto_cliente?: File | null;
  foto_dni?: File | null;
  foto_dni_reverso?: File | null;
  foto_casa?: File | null;
  foto_negocio?: File | null;
}

export interface UpdateClientePayload extends ClienteIdentidadFields, ClienteDireccionFields {
  nombre?: string;
  apellido?: string;
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
  telefono?: string;
  direccion_negocio?: string;
  ubigeo_distrito_negocio_id?: number;
  referencia_negocio?: string;
  latitud_negocio?: number;
  longitud_negocio?: number;
  estado?: Estado;
  foto_cliente?: File | null;
  foto_dni?: File | null;
  foto_dni_reverso?: File | null;
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

export interface ListClientesParams {
  page?: number;
  /** Free-text search across nombre, apellido and numero_documento (server-side). */
  q?: string;
  estado?: Estado;
  tipo_documento?: TipoDocumento;
  agencia_id?: number;
  perPage?: number;
}

export function listClientes(params: ListClientesParams = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.q) search.set('q', params.q);
  if (params.estado) search.set('estado', params.estado);
  if (params.tipo_documento) search.set('tipo_documento', params.tipo_documento);
  if (params.agencia_id) search.set('agencia_id', String(params.agencia_id));
  if (params.perPage) search.set('per_page', String(params.perPage));

  const query = search.toString();

  return apiFetch<ApiResponse<PaginatedData<Cliente>>>(`/clientes${query ? `?${query}` : ''}`);
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

export interface AsesorParaAsignar {
  id: number;
  nombre: string;
  apellido: string;
  agencia_id: number;
  supervisor_id: number | null;
}

/** Asesores elegibles para asignar, acotados a la agencia del cliente. */
export function getAsesoresParaAsignar(agenciaId?: number) {
  const query = agenciaId ? `?agencia_id=${agenciaId}` : '';

  return apiFetch<ApiResponse<AsesorParaAsignar[]>>(`/clientes/asesores${query}`);
}
