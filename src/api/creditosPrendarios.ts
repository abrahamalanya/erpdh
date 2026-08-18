import { apiFetch } from './client';
import type {
  ApiResponse,
  CreditoPrendario,
  DocumentoCreditoPrendario,
  PaginatedData,
  TipoCuota,
} from '../types/api';

export interface CreateCreditoPayload {
  bien_id: number;
  cliente_id: number;
  monto_prestamo: string;
  interes?: string;
  tipo_cuota: TipoCuota;
}

export function listCreditos(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<CreditoPrendario>>>(`/creditos-prendarios?page=${page}`);
}

export function getCredito(id: number) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}`);
}

export function createCredito(payload: CreateCreditoPayload) {
  return apiFetch<ApiResponse<CreditoPrendario>>('/creditos-prendarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function aprobarCredito(id: number) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/aprobar`, {
    method: 'POST',
  });
}

export function rechazarCredito(id: number, motivo?: string) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export function firmarCredito(id: number) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/firmar`, {
    method: 'POST',
  });
}

export function refrendarCredito(id: number, montoInteresPagado: string) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/refrendar`, {
    method: 'POST',
    body: JSON.stringify({ monto_interes_pagado: montoInteresPagado }),
  });
}

export function liquidarCredito(id: number) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/liquidar`, {
    method: 'POST',
  });
}

export function marcarImpresoDocumento(creditoId: number, documentoId: number) {
  return apiFetch<ApiResponse<DocumentoCreditoPrendario>>(
    `/creditos-prendarios/${creditoId}/documentos/${documentoId}/marcar-impreso`,
    { method: 'POST' }
  );
}

export function marcarFirmadoDocumento(creditoId: number, documentoId: number) {
  return apiFetch<ApiResponse<DocumentoCreditoPrendario>>(
    `/creditos-prendarios/${creditoId}/documentos/${documentoId}/marcar-firmado`,
    { method: 'POST' }
  );
}
