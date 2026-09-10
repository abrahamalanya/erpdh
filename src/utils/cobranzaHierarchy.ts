import type { User } from '../types/api';
import { hasPermission } from './roles';
import type { CobroOperacion } from '../api/cobros';

/**
 * Permisos del módulo Cobranzas — gated por `permission_names` (no roles
 * hardcodeados), igual que creditoPrendarioHierarchy. 'sistemas' pasa por
 * el before() del backend y ya viene incluido en permission_names.
 */
export function canVerCobranzas(user: User | null): boolean {
  return hasPermission(user, 'cobranzas.ver');
}

export function canRegistrarCobranza(user: User | null): boolean {
  return hasPermission(user, 'cobranzas.registrar');
}

export const COBRO_OPERACION_LABELS: Record<CobroOperacion, string> = {
  refrendo: 'Refrendo',
  adenda: 'Adenda',
  liquidacion: 'Liquidación',
};

export const COBRO_OPERACION_COLOR: Record<CobroOperacion, 'default' | 'success' | 'info'> = {
  refrendo: 'info',
  adenda: 'default',
  liquidacion: 'success',
};
