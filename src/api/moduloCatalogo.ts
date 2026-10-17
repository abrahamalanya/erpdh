import { apiFetch } from './client';
import type { ApiResponse, Modulo } from '../types/api';

export interface ModuloCatalogo extends Modulo {
  revision: string;
}

export interface ModuloDetalle extends ModuloCatalogo {
  uso: {
    perfiles: { id: number; nombre: string }[];
    roles: { id: number; name: string }[];
    selecciones_individuales: number;
    rutas_api: { metodo: string; ruta: string }[];
    puede_eliminar: boolean;
  };
}

interface ModuloDatos {
  nombre: string;
  grupo: string | null;
}

export const listModulosCatalogo = () => apiFetch<ApiResponse<ModuloCatalogo[]>>('/modulos');
export const getModulo = (id: number) => apiFetch<ApiResponse<ModuloDetalle>>('/modulos/' + id);
export const createModulo = (data: ModuloDatos & { key: string }) =>
  apiFetch<ApiResponse<ModuloCatalogo>>('/modulos', { method: 'POST', body: JSON.stringify(data) });
export const updateModulo = (id: number, data: ModuloDatos & { revision: string }) =>
  apiFetch<ApiResponse<ModuloCatalogo>>('/modulos/' + id, { method: 'PUT', body: JSON.stringify(data) });
export const deleteModulo = (id: number, revision: string) =>
  apiFetch<ApiResponse<null>>('/modulos/' + id, { method: 'DELETE', body: JSON.stringify({ revision }) });
