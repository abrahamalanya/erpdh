import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  Credito,
  DocumentoCredito,
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

export interface CreateCreditoVehicularPayload {
  vehiculo_ids: number[];
  supervisado_por: number;
  monto_prestamo: string;
  interes?: string;
  tipo_cuota: TipoCuota;
}

export interface CreateCreditoHipotecarioPayload {
  inmueble_ids: number[];
  supervisado_por: number;
  monto_prestamo: string;
  interes?: string;
  tipo_cuota: TipoCuota;
}

export function listCreditos(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Credito>>>(`/creditos-prendarios?page=${page}`);
}

export function getCredito(id: number) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}`);
}

export function createCredito(payload: CreateCreditoPayload) {
  return apiFetch<ApiResponse<Credito>>('/creditos-prendarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Registra un crédito vehicular; su ciclo posterior usa /creditos-prendarios/{id}/*. */
export function createCreditoVehicular(payload: CreateCreditoVehicularPayload) {
  return apiFetch<ApiResponse<Credito>>('/creditos-vehiculares', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Registra un crédito hipotecario; su ciclo posterior usa /creditos-prendarios/{id}/*. */
export function createCreditoHipotecario(payload: CreateCreditoHipotecarioPayload) {
  return apiFetch<ApiResponse<Credito>>('/creditos-hipotecarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function aprobarCredito(id: number) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/aprobar`, {
    method: 'POST',
  });
}

export function rechazarCredito(id: number, motivo: string) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export function subsanarCredito(id: number) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/subsanar`, {
    method: 'POST',
  });
}

export interface DesembolsarCreditoPayload {
  numero_cuotas?: number;
  interes?: string;
}

export function desembolsarCredito(id: number, payload: DesembolsarCreditoPayload = {}) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/desembolsar`, {
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
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/refrendar`, {
    method: 'POST',
    body: toCobroFormData(payload),
  });
}

export function liquidarCredito(id: number, payload: CobroPayload) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/liquidar`, {
    method: 'POST',
    body: toCobroFormData(payload),
  });
}

export interface AdendarCreditoPayload extends CobroPayload {
  interes?: string;
  tipo_cuota?: TipoCuota;
}

export function adendarCredito(id: number, payload: AdendarCreditoPayload) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/adendar`, {
    method: 'POST',
    body: toCobroFormData(payload),
  });
}

export function actualizarInteresCredito(id: number, interes: string) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/actualizar-interes`, {
    method: 'POST',
    body: JSON.stringify({ interes }),
  });
}

export function revertirAprobacionCredito(id: number) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/revertir-aprobacion`, {
    method: 'POST',
  });
}

/**
 * `precios` is a { garantiaId: precioVenta } map — the sale price shown in
 * the tienda for each garantía. For vehicular/hipotecario en pendiente_
 * conformidad, primero se registra la conformidad (confirmarConformidad).
 */
export function enviarATiendaCredito(id: number, precios: Record<number, number>) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/enviar-tienda`, {
    method: 'POST',
    body: JSON.stringify({ precios }),
  });
}

/** Sube el PDF de conformidad del notario/abogado de un crédito en pendiente_conformidad (vehicular / hipotecario). */
export function confirmarConformidadCredito(id: number, archivo: File) {
  const formData = new FormData();
  formData.append('archivo', archivo);

  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/conformidad`, {
    method: 'POST',
    body: formData,
  });
}

export function getDocumentoBlob(verUrl: string) {
  return apiFetchBlob(verUrl);
}

export function getCronogramaBlob(creditoId: number) {
  return apiFetchBlob(`/creditos-prendarios/${creditoId}/cronograma/ver`);
}

export function marcarImpresoDocumento(creditoId: number, documentoId: number) {
  return apiFetch<ApiResponse<DocumentoCredito>>(
    `/creditos-prendarios/${creditoId}/documentos/${documentoId}/marcar-impreso`,
    { method: 'POST' }
  );
}

export function subirDocumentoFirmado(creditoId: number, documentoId: number, archivo: File) {
  const formData = new FormData();
  formData.append('archivo', archivo);

  return apiFetch<ApiResponse<DocumentoCredito>>(
    `/creditos-prendarios/${creditoId}/documentos/${documentoId}/subir-firmado`,
    { method: 'POST', body: formData }
  );
}
