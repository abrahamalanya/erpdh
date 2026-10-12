import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  Comprobante,
  ComprobanteEmitido,
  EstadoComprobante,
  PaginatedData,
  PreviewComprobanteCredito,
  CreditoPendienteFacturar,
  CredencialesSunat,
  ConfiguracionFacturacion,
  SerieComprobante,
  TipoDocumentoSunat,
} from '../types/api';

/* ===== Créditos pendientes de facturar / emisión ===== */

/** Créditos liquidados (o liquidado_pendiente) sin comprobante. */
export function listCreditosPendientesFacturar(agenciaId?: number) {
  const query = agenciaId ? `?agencia_id=${agenciaId}` : '';
  return apiFetch<ApiResponse<CreditoPendienteFacturar[]>>(`/facturacion/creditos-pendientes${query}`);
}

/**
 * Emite factura (cliente con RUC) o boleta (DNI) por el interés + mora
 * cobrados — nunca el capital. Queda en 'generado': el envío a SUNAT lo hace
 * un job en segundo plano (cada 15 min) o reenviarComprobante().
 */
export function emitirComprobanteCredito(creditoId: number, observaciones?: string) {
  return apiFetch<ApiResponse<ComprobanteEmitido>>(`/facturacion/creditos/${creditoId}/emitir`, {
    method: 'POST',
    body: JSON.stringify({ observaciones: observaciones || undefined }),
  });
}

/** Base imponible, IGV y total del comprobante que se emitiría, sin crear nada. */
export function previsualizarComprobanteCredito(creditoId: number) {
  return apiFetch<ApiResponse<PreviewComprobanteCredito>>(`/facturacion/creditos/${creditoId}/previsualizar`);
}

/* ===== Comprobantes ===== */

export interface ComprobantesFilters {
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo_documento?: TipoDocumentoSunat;
  estado?: EstadoComprobante;
  serie?: string;
  agencia_id?: number;
}

export function listComprobantes(page = 1, filters: ComprobantesFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }

  return apiFetch<ApiResponse<PaginatedData<Comprobante>>>(`/facturacion/comprobantes?${params.toString()}`);
}

/** Con `detalles`. */
export function getComprobante(id: number) {
  return apiFetch<ApiResponse<Comprobante>>(`/facturacion/comprobantes/${id}`);
}

export function getComprobantePdf(id: number) {
  return apiFetchBlob(`/facturacion/comprobantes/${id}/pdf`);
}

/** Reintenta el envío a SUNAT; solo en estado generado o error. */
export function reenviarComprobante(id: number) {
  return apiFetch<ApiResponse<ComprobanteEmitido>>(`/facturacion/comprobantes/${id}/reenviar`, { method: 'POST' });
}

/** Consulta el estado en SUNAT y lo actualiza. No aplica a boletas con resumen_diario_ticket. */
export function consultarCdrComprobante(id: number) {
  return apiFetch<ApiResponse<Comprobante>>(`/facturacion/comprobantes/${id}/cdr`);
}

/** Anulación local, sin SUNAT: solo para comprobantes nunca enviados (generado/error/rechazado). */
export function anularComprobante(id: number, motivo: string) {
  return apiFetch<ApiResponse<Comprobante>>(`/facturacion/comprobantes/${id}/anular`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

/* ===== Configuración ===== */

/** null = la empresa aún no tiene configuración. */
export function getConfiguracionFacturacion() {
  return apiFetch<ApiResponse<ConfiguracionFacturacion | null>>('/configuracion-facturacion');
}

export type ConfiguracionFacturacionPayload = Partial<
  Pick<
    ConfiguracionFacturacion,
    | 'modo'
    | 'igv_porcentaje'
    | 'moneda'
    | 'interes_incluye_igv'
    | 'serie_factura_defecto'
    | 'serie_boleta_defecto'
    | 'bloquear_si_supera_umbral'
    | 'activo'
  >
> & { empresa_id?: number };

/** Solo actualiza lo que se manda; crea la configuración si no existe. */
export function updateConfiguracionFacturacion(payload: ConfiguracionFacturacionPayload) {
  return apiFetch<ApiResponse<ConfiguracionFacturacion>>('/configuracion-facturacion', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/* ===== Series ===== */

export function listSeriesComprobante(filters: { tipo_documento?: TipoDocumentoSunat; estado?: boolean } = {}) {
  const params = new URLSearchParams();
  if (filters.tipo_documento) params.set('tipo_documento', filters.tipo_documento);
  if (filters.estado !== undefined) params.set('estado', filters.estado ? '1' : '0');
  const query = params.toString();

  return apiFetch<ApiResponse<SerieComprobante[]>>(`/facturacion/series${query ? `?${query}` : ''}`);
}

export interface CreateSeriePayload {
  tipo_documento: TipoDocumentoSunat;
  /** Exactamente 4 caracteres, p.ej. F001 / B001. */
  serie: string;
  agencia_id?: number;
  descripcion?: string;
  limite_numeracion?: number;
}

export function createSerieComprobante(payload: CreateSeriePayload) {
  return apiFetch<ApiResponse<SerieComprobante>>('/facturacion/series', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSerieComprobante(
  serie: string,
  payload: { descripcion?: string; estado?: boolean; limite_numeracion?: number | null }
) {
  return apiFetch<ApiResponse<SerieComprobante>>(`/facturacion/series/${encodeURIComponent(serie)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** 422 si la serie ya emitió comprobantes: en ese caso hay que inactivarla. */
export function deleteSerieComprobante(serie: string) {
  return apiFetch<ApiResponse<null>>(`/facturacion/series/${encodeURIComponent(serie)}`, { method: 'DELETE' });
}

/* ===== Credenciales SUNAT (certificado + usuario/clave SOL) ===== */

export function getCredencialesSunat(empresaId: number) {
  return apiFetch<ApiResponse<CredencialesSunat>>(`/empresas/${empresaId}/credenciales-sunat`);
}

export interface CredencialesSunatPayload {
  usuario_sol: string;
  /** Write-only: vacío = no cambiar. */
  clave_sol?: string;
  /** .pfx/.p12 tal cual lo entregaron (el backend reempaqueta los de RENIEC). Opcional si ya hay uno. */
  certificado?: File | null;
  /** Write-only: vacío = no cambiar. */
  certificado_password?: string;
  razon_social_certificado?: string;
  certificado_vence_en?: string;
  modo_facturacion?: 'beta' | 'produccion';
}

/** Multipart por el archivo del certificado; los campos vacíos no se envían (= se conservan). */
export function saveCredencialesSunat(empresaId: number, payload: CredencialesSunatPayload) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === '') continue;
    formData.append(key, value instanceof File ? value : String(value));
  }

  return apiFetch<ApiResponse<CredencialesSunat>>(`/empresas/${empresaId}/credenciales-sunat`, {
    method: 'POST',
    body: formData,
  });
}

/** Firma un XML de prueba con el certificado real. */
export function validarCredencialesSunat(empresaId: number) {
  return apiFetch<ApiResponse<CredencialesSunat>>(`/empresas/${empresaId}/credenciales-sunat/validar`, {
    method: 'POST',
  });
}

export function deleteCredencialesSunat(empresaId: number) {
  return apiFetch<ApiResponse<null>>(`/empresas/${empresaId}/credenciales-sunat`, { method: 'DELETE' });
}
