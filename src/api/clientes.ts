import { apiFetch } from './client';
import type { ApiResponse, Cliente, ConsultaDniResult, Estado, LugarCobranza, PaginatedData, TipoDocumento } from '../types/api';

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

/** Fotos de un solo archivo: cada una reemplaza a la anterior (columna `{campo}_path`). */
interface ClienteFotoSimpleFields {
  foto_cliente?: File | null;
  foto_dni?: File | null;
  foto_dni_reverso?: File | null;
  foto_suministro?: File | null;
  foto_recibo_luz?: File | null;
}

/** Fotos múltiples: se agregan al final del tipo, sin tocar las ya guardadas. */
interface ClienteFotoNuevaFields {
  fotos_casa?: File[];
  fotos_negocio?: File[];
  fotos_adicionales?: File[];
}

export interface CreateClientePayload
  extends ClienteIdentidadFields,
    ClienteDireccionFields,
    ClienteFotoSimpleFields,
    ClienteFotoNuevaFields {
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  whatsapp?: string;
  /** Lista completa de teléfonos (hasta 5): reemplaza cualquier lista previa. */
  telefonos?: string[];
  direccion_negocio?: string;
  ubigeo_distrito_negocio_id?: number;
  referencia_negocio?: string;
  latitud_negocio?: number;
  longitud_negocio?: number;
  lugar_cobranza?: LugarCobranza;
  empresa_id?: number;
  agencia_id?: number;
}

/**
 * `fotos_{tipo}_conservar` es el juego definitivo de ids que quedan de ese
 * tipo: el backend borra las que no estén en la lista y reescribe el `orden`
 * con el orden del arreglo. Omitir el campo deja ese tipo intacto, así que
 * mandarlo siempre es lo que permite borrar una foto suelta.
 */
interface ClienteFotoConservarFields {
  fotos_casa_conservar?: number[];
  fotos_negocio_conservar?: number[];
  fotos_adicionales_conservar?: number[];
}

export interface UpdateClientePayload
  extends ClienteIdentidadFields,
    ClienteDireccionFields,
    ClienteFotoSimpleFields,
    ClienteFotoNuevaFields,
    ClienteFotoConservarFields {
  nombre?: string;
  apellido?: string;
  tipo_documento?: TipoDocumento;
  numero_documento?: string;
  whatsapp?: string;
  /** Lista completa de teléfonos (hasta 5): reemplaza cualquier lista previa. */
  telefonos?: string[];
  direccion_negocio?: string;
  ubigeo_distrito_negocio_id?: number;
  referencia_negocio?: string;
  latitud_negocio?: number;
  longitud_negocio?: number;
  lugar_cobranza?: LugarCobranza;
  estado?: Estado;
}

/**
 * Un `FormData` vacío (ningún elemento en el arreglo) no manda la clave en
 * absoluto, indistinguible para el backend de "el campo no vino" — que es
 * justo lo que significa "no toques la lista". Para poder vaciar la lista de
 * teléfonos hay que mandar la clave de todos modos; este string vacío es el
 * marcador que `ClienteTelefonoService` reconoce y descarta.
 */
export function telefonosParaEnviar(telefonos: string[]): string[] {
  return telefonos.length > 0 ? telefonos : [''];
}

/**
 * Un `File[]` (fotos múltiples) y un `number[]` (ids a conservar) son cosas
 * distintas: el primero va con la notación `clave[]` que PHP reensambla como
 * archivos, el segundo con la misma notación pero como enteros. Sin este
 * desglose, `String([archivo])` mandaría "[object File]" y el backend no
 * vería ninguna imagen.
 */
function toFormData(payload: object): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, item instanceof File ? item : String(item)));
      continue;
    }

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

export function getCliente(id: number) {
  return apiFetch<ApiResponse<Cliente>>(`/clientes/${id}`);
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

/**
 * Borra una foto múltiple suelta (casa, negocio o adicional). El backend la
 * resuelve siempre a través del cliente, así que un id ajeno da 404.
 */
export function deleteClienteFoto(clienteId: number, fotoId: number) {
  return apiFetch<ApiResponse<null>>(`/clientes/${clienteId}/fotos/${fotoId}`, {
    method: 'DELETE',
  });
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

/** Reference data for credit/sales forms; administrative client access stays separate. */
export function listClientesOpciones(params: ListClientesParams = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.perPage) query.set('per_page',String(params.perPage));
  return apiFetch<ApiResponse<PaginatedData<Cliente>>>('/opciones/clientes?'+query.toString());
}
export function getClienteOpcion(id:number) {
  return apiFetch<ApiResponse<Cliente>>('/opciones/clientes/'+id);
}
