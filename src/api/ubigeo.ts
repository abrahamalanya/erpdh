import { apiFetch } from './client';
import type { ApiResponse } from '../types/api';

export interface UbigeoDepartamento {
  id: number;
  codigo: string;
  nombre: string;
}

export interface UbigeoProvincia {
  id: number;
  ubigeo_departamento_id: number;
  codigo: string;
  nombre: string;
}

export interface UbigeoDistrito {
  id: number;
  ubigeo_provincia_id: number;
  codigo: string;
  nombre: string;
}

export interface UbigeoDistritoConCadena extends UbigeoDistrito {
  provincia: UbigeoProvincia & { departamento: UbigeoDepartamento };
}

export function listUbigeoDepartamentos() {
  return apiFetch<ApiResponse<UbigeoDepartamento[]>>('/ubigeo/departamentos');
}

export function listUbigeoProvincias(departamentoId: number) {
  return apiFetch<ApiResponse<UbigeoProvincia[]>>(`/ubigeo/departamentos/${departamentoId}/provincias`);
}

export function listUbigeoDistritos(provinciaId: number) {
  return apiFetch<ApiResponse<UbigeoDistrito[]>>(`/ubigeo/provincias/${provinciaId}/distritos`);
}

/** Resuelve distrito -> provincia -> departamento de un solo llamado — para precargar el select en cascada al editar. */
export function getUbigeoDistrito(distritoId: number) {
  return apiFetch<ApiResponse<UbigeoDistritoConCadena>>(`/ubigeo/distritos/${distritoId}`);
}
