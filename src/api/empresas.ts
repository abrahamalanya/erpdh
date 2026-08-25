import { apiFetch } from './client';
import type { ApiResponse, Empresa, Estado, PaginatedData } from '../types/api';

export interface EmpresaPayload {
  nombre: string;
  ruc?: string;
  razon_social?: string;
  domicilio_legal?: string;
  actividad_economica?: string;
  representante_legal?: string;
  logo?: File | null;
  firma?: File | null;
  estado?: Estado;
}

function toFormData(payload: object): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    formData.append(key, value instanceof File ? value : String(value));
  }

  return formData;
}

export function listEmpresas(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Empresa>>>(`/empresas?page=${page}`);
}

export function createEmpresa(payload: EmpresaPayload) {
  return apiFetch<ApiResponse<Empresa>>('/empresas', {
    method: 'POST',
    body: toFormData(payload),
  });
}

export function updateEmpresa(id: number, payload: Partial<EmpresaPayload>) {
  const formData = toFormData(payload);
  formData.append('_method', 'PUT');

  return apiFetch<ApiResponse<Empresa>>(`/empresas/${id}`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteEmpresa(id: number) {
  return apiFetch<ApiResponse<null>>(`/empresas/${id}`, { method: 'DELETE' });
}
