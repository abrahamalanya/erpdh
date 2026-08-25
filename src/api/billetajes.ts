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
  datosRecepcion?: string
) {
  return apiFetch<ApiResponse<Billetaje>>('/billetajes', {
    method: 'POST',
    body: JSON.stringify({
      monto,
      motivo,
      medio_recepcion: medioRecepcion,
      ...(datosRecepcion ? { datos_recepcion: datosRecepcion } : {}),
    }),
  });
}

export function aprobarBilletaje(
  id: number,
  medioEgreso: MedioEgresoBilletaje = 'efectivo',
  canalEgreso?: CanalEgresoBilletaje,
  cuentaBancariaId?: number
) {
  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/aprobar`, {
    method: 'POST',
    body: JSON.stringify({
      medio_egreso: medioEgreso,
      ...(canalEgreso ? { canal_egreso: canalEgreso } : {}),
      ...(cuentaBancariaId ? { cuenta_bancaria_id: cuentaBancariaId } : {}),
    }),
  });
}

export function rechazarBilletaje(id: number, motivo?: string) {
  return apiFetch<ApiResponse<Billetaje>>(`/billetajes/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}
