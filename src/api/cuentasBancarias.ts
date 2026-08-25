import { apiFetch } from './client';
import type {
  ApiResponse,
  ConciliacionBancaria,
  CuentaBancaria,
  CuentaBancariaMovimiento,
  CuentaBancariaMovimientoTipo,
  CuentaBancariaTipo,
  Moneda,
  PaginatedData,
} from '../types/api';

export interface CuentaBancariaPayload {
  banco_id: number;
  numero_cuenta: string;
  titular: string;
  tipo_cuenta?: CuentaBancariaTipo;
  moneda?: Moneda;
  alias?: string;
  saldo_inicial?: string;
  acepta_yape?: boolean;
  numero_yape?: string;
  acepta_plin?: boolean;
  numero_plin?: string;
}

export interface CuentaBancariaUpdatePayload {
  banco_id?: number;
  numero_cuenta?: string;
  titular?: string;
  tipo_cuenta?: CuentaBancariaTipo;
  moneda?: Moneda;
  alias?: string;
  activa?: boolean;
  acepta_yape?: boolean;
  numero_yape?: string;
  acepta_plin?: boolean;
  numero_plin?: string;
}

export function listCuentasBancarias(bovedaId: number) {
  return apiFetch<ApiResponse<CuentaBancaria[]>>(`/bovedas/${bovedaId}/cuentas-bancarias`);
}

export function createCuentaBancaria(bovedaId: number, payload: CuentaBancariaPayload) {
  return apiFetch<ApiResponse<CuentaBancaria>>(`/bovedas/${bovedaId}/cuentas-bancarias`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCuentaBancaria(id: number, payload: CuentaBancariaUpdatePayload) {
  return apiFetch<ApiResponse<CuentaBancaria>>(`/cuentas-bancarias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteCuentaBancaria(id: number) {
  return apiFetch<ApiResponse<null>>(`/cuentas-bancarias/${id}`, { method: 'DELETE' });
}

export function registrarMovimientoCuentaBancaria(
  id: number,
  tipo: CuentaBancariaMovimientoTipo,
  monto: string,
  concepto?: string
) {
  return apiFetch<ApiResponse<CuentaBancariaMovimiento>>(`/cuentas-bancarias/${id}/movimiento`, {
    method: 'POST',
    body: JSON.stringify(concepto ? { tipo, monto, concepto } : { tipo, monto }),
  });
}

export interface ReporteMovimientosCuentaBancaria {
  movimientos: PaginatedData<CuentaBancariaMovimiento>;
  resumen: {
    total_ingresos: string;
    total_egresos: string;
  };
}

export function listMovimientosCuentaBancaria(id: number, page = 1) {
  return apiFetch<ApiResponse<ReporteMovimientosCuentaBancaria>>(
    `/cuentas-bancarias/${id}/movimientos?page=${page}`
  );
}

export function conciliarCuentaBancaria(id: number, saldoBanco: string, observacion?: string) {
  return apiFetch<ApiResponse<ConciliacionBancaria>>(`/cuentas-bancarias/${id}/conciliar`, {
    method: 'POST',
    body: JSON.stringify(observacion ? { saldo_banco: saldoBanco, observacion } : { saldo_banco: saldoBanco }),
  });
}

export function listConciliacionesCuentaBancaria(id: number, page = 1) {
  return apiFetch<ApiResponse<PaginatedData<ConciliacionBancaria>>>(
    `/cuentas-bancarias/${id}/conciliaciones?page=${page}`
  );
}
