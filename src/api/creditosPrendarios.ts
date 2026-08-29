import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  CreditoPrendario,
  DocumentoCreditoPrendario,
  MedioCobro,
  PaginatedData,
  TipoCuota,
} from '../types/api';

export interface CreateCreditoPayload {
  bien_ids: number[];
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

export function rechazarCredito(id: number, motivo: string) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export function subsanarCredito(id: number) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/subsanar`, {
    method: 'POST',
  });
}

export interface DesembolsarCreditoPayload {
  numero_cuotas?: number;
  interes?: string;
}

export function desembolsarCredito(id: number, payload: DesembolsarCreditoPayload = {}) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/desembolsar`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface CobroPayload {
  monto_pagado: string;
  medio: MedioCobro;
  comprobante?: File | null;
}

function toCobroFormData(payload: object): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    formData.append(key, value instanceof File ? value : String(value));
  }

  return formData;
}

export function refrendarCredito(id: number, payload: CobroPayload) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/refrendar`, {
    method: 'POST',
    body: toCobroFormData(payload),
  });
}

export function liquidarCredito(id: number, payload: CobroPayload) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/liquidar`, {
    method: 'POST',
    body: toCobroFormData(payload),
  });
}

export interface AdendarCreditoPayload extends CobroPayload {
  interes?: string;
  tipo_cuota?: TipoCuota;
}

export function adendarCredito(id: number, payload: AdendarCreditoPayload) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/adendar`, {
    method: 'POST',
    body: toCobroFormData(payload),
  });
}

export function actualizarInteresCredito(id: number, interes: string) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/actualizar-interes`, {
    method: 'POST',
    body: JSON.stringify({ interes }),
  });
}

export function revertirAprobacionCredito(id: number) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/revertir-aprobacion`, {
    method: 'POST',
  });
}

/** `precios` is a { bienId: precioVenta } map — the sale price shown in the tienda for each bien. */
export function enviarATiendaCredito(id: number, precios: Record<number, number>) {
  return apiFetch<ApiResponse<CreditoPrendario>>(`/creditos-prendarios/${id}/enviar-tienda`, {
    method: 'POST',
    body: JSON.stringify({ precios }),
  });
}

export function getDocumentoBlob(verUrl: string) {
  return apiFetchBlob(verUrl);
}

export function getCronogramaBlob(creditoId: number) {
  return apiFetchBlob(`/creditos-prendarios/${creditoId}/cronograma/ver`);
}

export function marcarImpresoDocumento(creditoId: number, documentoId: number) {
  return apiFetch<ApiResponse<DocumentoCreditoPrendario>>(
    `/creditos-prendarios/${creditoId}/documentos/${documentoId}/marcar-impreso`,
    { method: 'POST' }
  );
}

export function subirDocumentoFirmado(creditoId: number, documentoId: number, archivo: File) {
  const formData = new FormData();
  formData.append('archivo', archivo);

  return apiFetch<ApiResponse<DocumentoCreditoPrendario>>(
    `/creditos-prendarios/${creditoId}/documentos/${documentoId}/subir-firmado`,
    { method: 'POST', body: formData }
  );
}
