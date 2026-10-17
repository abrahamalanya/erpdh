import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  ConsultaDniResult,
  Estado,
  Modulo,
  PaginatedData,
  SeguroSalud,
  SistemaPension,
  User,
} from '../types/api';

/** Datos de perfil: imágenes, fecha de nacimiento y ubicación. Ver migración `add_perfil_fields_to_users_table`. */
interface UsuarioPerfilFields {
  perfil_acceso_id?: number | null;
  fecha_nacimiento?: string;
  direccion?: string;
  referencia?: string;
  /** Aceptan `null` (= limpiar el campo) además de `undefined` (= no enviar). Ver {@link toFormData}. */
  ubigeo_distrito_id?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  /** Foto de perfil — el backend la guarda en la columna `foto_path`. */
  foto?: File | null;
  /** Imagen del QR de Yape — columna `qr_yape_path`. */
  qr_yape?: File | null;
  /** Planilla: si en_planilla es true, sistema_pension y seguro_salud son obligatorios (422 si faltan). */
  en_planilla?: boolean;
  sistema_pension?: SistemaPension | null;
  seguro_salud?: SeguroSalud | null;
}

export interface CreateUserPayload extends UsuarioPerfilFields {
  nombre: string;
  apellido: string;
  dni: string;
  usuario?: string;
  telefono?: string;
  email?: string;
  password?: string;
  estado?: Estado;
  roles: string[];
  empresa_id?: number;
  agencia_id?: number;
  supervisor_id?: number;
}

export interface UpdateUserPayload extends UsuarioPerfilFields {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  estado?: Estado;
  password?: string;
  roles?: string[];
  /** Required by the backend when the resulting roles include an agencia-level one and the user has no agencia yet. */
  agencia_id?: number;
}

/**
 * Serializa el payload a FormData, necesario porque `foto` y `qr_yape` viajan
 * como archivo.
 *
 * Dos sutilezas del backend:
 * - `undefined` = no enviar la clave (el campo queda como está); `null` =
 *   limpiarla. Para eso se manda cadena vacía: el middleware global
 *   `ConvertEmptyStringsToNull` de Laravel la convierte en null antes de
 *   validar, así que las reglas `nullable` la aceptan y la columna queda NULL.
 * - Los arrays usan la notación `clave[]`, que PHP reensambla como array.
 *   `String(['asesor','supervisor'])` daría "asesor,supervisor" y `roles.*`
 *   fallaría la validación.
 * - Los booleanos van como '1'/'0': la regla `boolean` de Laravel no acepta
 *   las cadenas "true"/"false" que daría String(true).
 */
function toFormData(payload: object): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, String(item)));
      continue;
    }

    if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
      continue;
    }

    if (value === null) {
      formData.append(key, '');
      continue;
    }

    formData.append(key, value instanceof File ? value : String(value));
  }

  return formData;
}

export interface ListUsersFilters {
  nombre?: string;
  dni?: string;
  estado?: string;
  role?: string;
  agencia_id?: number;
  empresa_id?: number;
  /** Solo usuarios marcados para planilla (selector de trabajadores). */
  en_planilla?: boolean;
}

export function listUsers(page = 1, filters: ListUsersFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.nombre) params.set('nombre', filters.nombre);
  if (filters.dni) params.set('dni', filters.dni);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.role) params.set('role', filters.role);
  if (filters.agencia_id) params.set('agencia_id', String(filters.agencia_id));
  if (filters.empresa_id) params.set('empresa_id', String(filters.empresa_id));
  if (filters.en_planilla) params.set('en_planilla', '1');

  return apiFetch<ApiResponse<PaginatedData<User>>>(`/usuarios?${params.toString()}`);
}

export function createUser(payload: CreateUserPayload) {
  return apiFetch<ApiResponse<User>>('/usuarios', {
    method: 'POST',
    body: toFormData(payload),
  });
}

/**
 * El multipart viaja como POST con `_method=PUT`: PHP no puebla `$_FILES` en
 * un PUT real, así que Laravel nunca vería `foto` ni `qr_yape`. El spoofing de
 * método es el mismo patrón que ya usan clientes, empresas e inmuebles.
 */
export function updateUser(id: number, payload: UpdateUserPayload) {
  const formData = toFormData(payload);
  formData.append('_method', 'PUT');

  return apiFetch<ApiResponse<User>>(`/usuarios/${id}`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteUser(id: number) {
  return apiFetch<ApiResponse<null>>(`/usuarios/${id}`, { method: 'DELETE' });
}

export function consultarDni(dni: string) {
  return apiFetch<ApiResponse<ConsultaDniResult>>(`/usuarios/consultar-dni/${dni}`);
}

/**
 * Tope de tarjetas por pedido — el backend valida `max:60` en
 * FotocheckRequest, así que la selección del frontend no puede pasarse.
 */
export const FOTOCHECK_MAX_USUARIOS = 60;

/** Tarjetas por hoja A4 horizontal — 3 arriba y 3 abajo. Ver FotocheckService::TARJETAS_POR_HOJA. */
export const FOTOCHECK_POR_HOJA = 6;

/**
 * Fotocheck (tarjeta de identificación del personal): hoja A4 horizontal con la
 * foto, el rol, el DNI y un QR, en el orden en que se manden los ids (3 arriba,
 * 3 abajo). El PDF lo arma dompdf y viene streameado, así que va por
 * apiFetchBlob y no por apiFetch.
 *
 * Misma autoridad que "ver usuarios": un id fuera del alcance del actor no
 * produce tarjeta en vez de error, así que un filtro de más no rompe la hoja.
 */
export function getFotocheckPdf(usuarioIds: number[]) {
  return apiFetchBlob('/usuarios/fotocheck/pdf', {
    method: 'POST',
    body: JSON.stringify({ usuario_ids: usuarioIds }),
  });
}

/** Roles the authenticated user is allowed to assign, resolved by the backend hierarchy. */
export function listRolesAsignables() {
  return apiFetch<ApiResponse<string[]>>('/usuarios/roles-asignables');
}

export interface ModulosUsuarioData {
  disponibles: Modulo[];
  /** Este override del usuario; null = ninguno (hereda el default de su rol). */
  asignados: string[] | null;
}

export function getUserModulos(id: number) {
  return apiFetch<ApiResponse<ModulosUsuarioData>>(`/usuarios/${id}/modulos`);
}

/** modulos = null quita el override (vuelve a heredar el default del rol); un arreglo (incluso vacío) fija uno explícito. */
export function updateUserModulos(id: number, modulos: string[] | null) {
  return apiFetch<ApiResponse<ModulosUsuarioData>>(`/usuarios/${id}/modulos`, {
    method: 'PUT',
    body: JSON.stringify({ modulos }),
  });
}
