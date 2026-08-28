import type { CajaMovimiento } from '../types/api';

/**
 * caja_movimientos has exactly three sources (CajaService::registrarMovimiento,
 * BilletajeService::aprobar, CreditoPrendarioService::desembolsar) — a
 * desembolso is the only 'egreso' among them with no concepto_id/billetaje_id,
 * so that combination reliably tells them apart without a backend field.
 * Shared by the cierre-de-caja detail and the Egresos module list.
 */
export function movimientoCicloLabel(m: CajaMovimiento): string {
  if (m.tipo === 'billetaje') return 'Billetaje';
  if (m.tipo === 'egreso' && !m.concepto_id && !m.billetaje_id) return 'Desembolso';
  return m.tipo === 'egreso' ? 'Egreso' : 'Ingreso';
}

export function movimientoCicloColor(m: CajaMovimiento): 'success' | 'error' | 'secondary' {
  if (m.tipo === 'egreso' && !m.concepto_id && !m.billetaje_id) return 'secondary';
  return m.tipo === 'egreso' ? 'error' : 'success';
}
