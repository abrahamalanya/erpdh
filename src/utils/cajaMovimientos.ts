import type { CajaMovimiento } from '../types/api';

/**
 * caja_movimientos has exactly three sources (CajaService::registrarMovimiento,
 * BilletajeService::aprobar, CreditoService::desembolsar). Un desembolso
 * real está enlazado al crédito que lo originó; ese vínculo es la fuente de
 * verdad para separarlo de un egreso manual.
 * Shared by the cierre-de-caja detail and the Egresos module list.
 */
export function movimientoCicloLabel(m: CajaMovimiento): string {
  if (m.tipo === 'billetaje') return 'Billetaje';
  if (m.tipo === 'egreso' && m.credito_id) return 'Desembolso';
  return m.tipo === 'egreso' ? 'Egreso' : 'Ingreso';
}

export function movimientoCicloColor(m: CajaMovimiento): 'success' | 'error' | 'secondary' {
  if (m.tipo === 'egreso' && m.credito_id) return 'secondary';
  return m.tipo === 'egreso' ? 'error' : 'success';
}
