import type { EstadoComprobante, TipoDocumentoSunat, User } from '../types/api';
import { hasPermission } from './roles';
import { tieneModulo } from './modulos';

const conModulo = (user: User | null) => tieneModulo(user, 'facturacion');

export const canVerFacturacion = (user: User | null) => conModulo(user) && hasPermission(user, 'facturaciones.ver');
export const canEmitirFacturacion = (user: User | null) => conModulo(user) && hasPermission(user, 'facturaciones.crear');
export const canVerConfigFacturacion = (user: User | null) =>
  conModulo(user) && hasPermission(user, 'configuraciones_facturacion.ver');
export const canEditarConfigFacturacion = (user: User | null) =>
  conModulo(user) && hasPermission(user, 'configuraciones_facturacion.editar');

export const TIPO_DOCUMENTO_SUNAT_LABEL: Record<TipoDocumentoSunat, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de crédito',
};

export const ESTADO_COMPROBANTE_LABEL: Record<EstadoComprobante, string> = {
  borrador: 'Borrador',
  generado: 'Pendiente de envío a SUNAT',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  observado: 'Observado',
  rechazado: 'Rechazado',
  error: 'Error',
  anulado: 'Anulado',
  sustituido: 'Sustituido',
};

export const ESTADO_COMPROBANTE_COLOR: Record<
  EstadoComprobante,
  'default' | 'info' | 'success' | 'warning' | 'error'
> = {
  borrador: 'default',
  generado: 'default',
  enviado: 'info',
  aceptado: 'success',
  observado: 'warning',
  rechazado: 'error',
  error: 'error',
  anulado: 'default',
  sustituido: 'default',
};

export const canAnularFacturacion = (user: User | null) => conModulo(user) && hasPermission(user, 'facturaciones.anular');
export const canDescargarFacturacion = (user: User | null) =>
  conModulo(user) && hasPermission(user, 'facturaciones.descargar');

/** Nunca enviados a SUNAT: se pueden reintentar o anular localmente. */
export const ESTADOS_REENVIABLES: EstadoComprobante[] = ['generado', 'error'];
export const ESTADOS_ANULABLES_LOCAL: EstadoComprobante[] = ['generado', 'error', 'rechazado'];
/** Ya llegaron a SUNAT: tiene sentido consultar su CDR. */
export const ESTADOS_CON_CDR: EstadoComprobante[] = ['enviado', 'aceptado', 'observado', 'rechazado'];
