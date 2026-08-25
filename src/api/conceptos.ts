import { apiFetch } from './client';
import type { ApiResponse, Concepto, ConceptoTipo } from '../types/api';

export interface ConceptoPayload {
  /** Required — sistemas has no empresa_id of its own, so it must always be picked explicitly. */
  empresa_id: number;
  tipo: ConceptoTipo;
  nombre: string;
  activo?: boolean;
}

export interface ConceptoUpdatePayload {
  nombre?: string;
  activo?: boolean;
}

export interface ListConceptosFilters {
  tipo?: ConceptoTipo;
  conInactivos?: boolean;
  /** Only meaningful for sistemas, who can browse every empresa's catalog — ignored (a no-op) for a regular tenant user. */
  empresaId?: number;
}

export function listConceptos(filters: ListConceptosFilters = {}) {
  const params = new URLSearchParams();
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.conInactivos) params.set('con_inactivos', '1');
  if (filters.empresaId) params.set('empresa_id', String(filters.empresaId));

  const query = params.toString();
  return apiFetch<ApiResponse<Concepto[]>>(`/conceptos${query ? `?${query}` : ''}`);
}

export function createConcepto(payload: ConceptoPayload) {
  return apiFetch<ApiResponse<Concepto>>('/conceptos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateConcepto(id: number, payload: ConceptoUpdatePayload) {
  return apiFetch<ApiResponse<Concepto>>(`/conceptos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteConcepto(id: number) {
  return apiFetch<ApiResponse<null>>(`/conceptos/${id}`, { method: 'DELETE' });
}
