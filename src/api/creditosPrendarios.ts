import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  Credito,
  DocumentoCredito,
  MedioCobro,
  PaginatedData,
  TipoCredito,
  TipoCuota,
  User,
} from '../types/api';

/** Usuario elegible como "supervisado por" en un crédito vehicular / hipotecario. */
export type SupervisorCredito = Pick<User, 'id' | 'nombre' | 'apellido'> & {
  agencia_id: number | null;
};

/**
 * Campos de interés compartidos por los tres tipos de registro. Un asesor
 * solo puede enviar una tasa propia si marca `interes_solicitud_especial`;
 * `motivo_interes` es obligatorio cuando la tasa difiere de la configurada.
 */
interface InteresCreditoFields {
  interes?: string;
  interes_solicitud_especial?: boolean;
  motivo_interes?: string;
}

export interface CreateCreditoPayload extends InteresCreditoFields {
  bien_ids: number[];
  monto_prestamo: string;
  tipo_cuota: TipoCuota;
}

export interface CreateCreditoVehicularPayload extends InteresCreditoFields {
  vehiculo_ids: number[];
  supervisado_por: number;
  monto_prestamo: string;
  tipo_cuota: TipoCuota;
}

export interface CreateCreditoHipotecarioPayload extends InteresCreditoFields {
  inmueble_ids: number[];
  supervisado_por: number;
  /** Aval (garante) — id de un cliente. */
  aval_id?: number;
  monto_prestamo: string;
  tipo_cuota: TipoCuota;
}

/** Interés por defecto ya resuelto por tipo, para la agencia del usuario (precarga el formulario de registro). */
export function getConfiguracionInteresDefaults() {
  return apiFetch<ApiResponse<{ interes_default: Record<TipoCredito, string | null> }>>(
    '/creditos-prendarios/configuracion'
  );
}

export interface CronogramaPreviewCuota {
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_capital: string;
  monto_interes: string;
  monto_total: string;
}

export interface CronogramaPreview {
  fecha_base: string;
  plazo_dias: number;
  cuotas: CronogramaPreviewCuota[];
}

/**
 * Cronograma tentativo (fecha de desembolso = hoy) para mostrarlo al
 * registrar el crédito, antes de que exista. No persiste nada.
 */
export function previewCronograma(payload: {
  monto_prestamo: string;
  interes: string;
  tipo_cuota: TipoCuota;
  numero_cuotas?: number;
}) {
  return apiFetch<ApiResponse<CronogramaPreview>>('/creditos-prendarios/cronograma-preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listCreditos(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Credito>>>(`/creditos-prendarios?page=${page}`);
}

export function getCredito(id: number) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}`);
}

/**
 * Administradores de agencia y supervisores elegibles como "supervisado por"
 * al registrar un crédito vehicular / hipotecario, ya acotados por el backend
 * a la agencia/empresa del usuario autenticado.
 */
export function getSupervisoresCredito() {
  return apiFetch<ApiResponse<SupervisorCredito[]>>('/creditos-prendarios/supervisores');
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

/** Regulariza la fecha de desembolso de un crédito activo/vencido; el backend recalcula el cronograma. */
export function actualizarFechaDesembolsoCredito(id: number, fechaDesembolso: string) {
  return apiFetch<ApiResponse<Credito>>(`/creditos-prendarios/${id}/actualizar-fecha-desembolso`, {
    method: 'POST',
    body: JSON.stringify({ fecha_desembolso: fechaDesembolso }),
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
