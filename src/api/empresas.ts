import { apiFetch } from './client';
import type { ApiResponse, Empresa, Estado, PaginatedData } from '../types/api';

export interface EmpresaPayload {
  nombre: string;
  estado?: Estado;
}

export function listEmpresas(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Empresa>>>(`/empresas?page=${page}`);
}

export function createEmpresa(payload: EmpresaPayload) {
  return apiFetch<ApiResponse<Empresa>>('/empresas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEmpresa(id: number, payload: Partial<EmpresaPayload>) {
  return apiFetch<ApiResponse<Empresa>>(`/empresas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteEmpresa(id: number) {
  return apiFetch<ApiResponse<null>>(`/empresas/${id}`, { method: 'DELETE' });
}
