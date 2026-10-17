import { apiFetch } from './client';
import type { ApiResponse, Modulo } from '../types/api';
export interface PerfilAcceso {
  id: number; nombre: string; descripcion: string | null; activo: boolean;
  updated_at: string; modulos: Modulo[];
}
export interface PerfilPayload { nombre: string; descripcion: string; activo: boolean; modulos: string[]; updated_at?: string; }
export const listPerfiles = () => apiFetch<ApiResponse<PerfilAcceso[]>>('/perfiles-acceso');
export const listCatalogo = () => apiFetch<ApiResponse<Modulo[]>>('/modulos');
export const savePerfil = (id: number | null, data: PerfilPayload) => apiFetch<ApiResponse<PerfilAcceso>>(id ? '/perfiles-acceso/' + id : '/perfiles-acceso', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
