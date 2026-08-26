import { apiFetch } from './client';
import type {
  ApiResponse,
  Billetaje,
  CanalEgresoBilletaje,
  MedioEgresoBilletaje,
  MedioRecepcionBilletaje,
  PaginatedData,
} from '../types/api';

export function listBilletajes(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<Billetaje>>>(`/billetajes?page=${page}`);
}

export function solicitarBilletaje(
  monto: string,
  motivo: string,
  medioRecepcion: MedioRecepcionBilletaje,
  datosRecepcion?: string,
  clienteId?: number
) {
  return apiFetch<ApiResponse<Billetaje>>('/billetajes', {
    method: 'POST',
    body: JSON.stringify({
      monto,
      motivo,
      medio_recepcion: medioRecepcion,
      ...(datosRecepcion ? { datos_recepcion: datosRecepcion } : {}),
      ...(clienteId ? { cliente_id: clienteId } : {}),
    }),
  });
}

/**
 * comprobante solo lo exige el backend cuando medioEgreso es
 * cuenta_bancaria — el vaucher prueba la transacción bancaria que
 * realmente salió de la bóveda, sin importar qué medio_recepcion pidió
 * el asesor al solicitar.
 */
export function aprobarBilletaje(
  id: number,
  medioEgreso: MedioEgresoBilletaje = 'efectivo',
  canalEgreso?: CanalEgresoBilletaje,
  cuentaBancariaId?: number,
  comprobante?: File | null
) {
  const formData = new FormData();
  formData.append('medio_egreso', medioEgreso);
  if (canalEgreso) formData.append('canal_egreso', canalEgreso);
  if (cuentaBancariaId) formData.append('cuenta_bancaria_id', String(cuentaBancariaId));
  if (comprobante) formData.append('comprobante', comprobante);

  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/aprobar`, {
    method: 'POST',
    body: formData,
  });
}

export function rechazarBilletaje(id: number, motivo?: string) {
  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}
