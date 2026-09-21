import { apiFetch } from './client';
import type {
  ApiResponse,
  Boveda,
  BovedaCiclo,
  BovedaCierreDetalle,
  BovedaMovimiento,
  CuentaBancariaMovimiento,
  InyeccionReporteItem,
  MedioInyeccion,
  PaginatedData,
} from '../types/api';

export function listBovedas(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Boveda>>>(`/bovedas?page=${page}`);
}

export function getMiBoveda() {
  return apiFetch<ApiResponse<Boveda>>('/bovedas/mia');
}

export function getBoveda(id: number) {
  return apiFetch<ApiResponse<Boveda>>(`/bovedas/${id}`);
}

/** Preview of everything a cerrarForzadoBoveda() call would count right now — see BovedaCierreDetalle. */
export function getDetalleCierreBoveda(id: number) {
  return apiFetch<ApiResponse<BovedaCierreDetalle>>(`/bovedas/${id}/cierre/detalle`);
}

/** Force-closes every open caja beneath this bóveda first, then closes the bóveda itself with monto_contado. */
export function cerrarForzadoBoveda(id: number, montoContado: string) {
  return apiFetch<ApiResponse<BovedaCiclo>>(`/bovedas/${id}/cerrar-forzado`, {
    method: 'POST',
    body: JSON.stringify({ monto_contado: montoContado }),
  });
}

export function aperturarBoveda(id: number, saldoInicial?: string) {
  return apiFetch<ApiResponse<BovedaCiclo>>(`/bovedas/${id}/aperturar`, {
    method: 'POST',
    body: JSON.stringify(saldoInicial ? { saldo_inicial: saldoInicial } : {}),
  });
}

export function inyectarBoveda(
  id: number,
  monto: string,
  concepto?: string,
  medio: MedioInyeccion = 'efectivo',
  cuentaBancariaId?: number,
  /** Only for a traspaso (target bóveda is de agencia) landing in a cuenta bancaria — which of the principal's own cuentas it comes out of. */
  cuentaBancariaOrigenId?: number,
  /** Voucher opcional cuando medio es cuenta_bancaria. */
  comprobante?: File | null
) {
  const formData = new FormData();
  formData.append('monto', monto);
  if (concepto) formData.append('concepto', concepto);
  formData.append('medio', medio);
  if (medio === 'cuenta_bancaria' && cuentaBancariaId) formData.append('cuenta_bancaria_id', String(cuentaBancariaId));
  if (medio === 'cuenta_bancaria' && cuentaBancariaOrigenId) formData.append('cuenta_bancaria_origen_id', String(cuentaBancariaOrigenId));
  if (medio === 'cuenta_bancaria' && comprobante) formData.append('comprobante', comprobante);

  return apiFetch<ApiResponse<BovedaMovimiento | CuentaBancariaMovimiento>>(`/bovedas/${id}/inyectar`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Retira dinero de la bóveda: salida externa en la principal, devolución a la
 * principal en una de agencia (ver BovedaService::retirar()).
 */
export function retirarBoveda(
  id: number,
  monto: string,
  concepto?: string,
  medio: MedioInyeccion = 'efectivo',
  /** Cuenta bancaria de ESTA bóveda de la que sale el dinero (medio cuenta_bancaria). */
  cuentaBancariaId?: number,
  /** Solo en una bóveda de agencia con medio cuenta_bancaria: cuenta de la principal que recibe. */
  cuentaBancariaDestinoId?: number,
  /** Voucher opcional cuando medio es cuenta_bancaria. */
  comprobante?: File | null
) {
  const formData = new FormData();
  formData.append('monto', monto);
  if (concepto) formData.append('concepto', concepto);
  formData.append('medio', medio);
  if (medio === 'cuenta_bancaria' && cuentaBancariaId) formData.append('cuenta_bancaria_id', String(cuentaBancariaId));
  if (medio === 'cuenta_bancaria' && cuentaBancariaDestinoId) formData.append('cuenta_bancaria_destino_id', String(cuentaBancariaDestinoId));
  if (medio === 'cuenta_bancaria' && comprobante) formData.append('comprobante', comprobante);

  return apiFetch<ApiResponse<BovedaMovimiento | CuentaBancariaMovimiento>>(`/bovedas/${id}/retirar`, {
    method: 'POST',
    body: formData,
  });
}

export function reabrirBoveda(id: number) {
  return apiFetch<ApiResponse<BovedaCiclo>>(`/bovedas/${id}/reabrir`, { method: 'POST' });
}

export function listInyecciones(id: number, desde?: string, hasta?: string) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const query = params.toString();

  return apiFetch<ApiResponse<InyeccionReporteItem[]>>(`/bovedas/${id}/inyecciones${query ? `?${query}` : ''}`);
}

export function eliminarInyeccion(bovedaId: number, movimientoId: number) {
  return apiFetch<ApiResponse<null>>(`/bovedas/${bovedaId}/inyecciones/${movimientoId}`, { method: 'DELETE' });
}
