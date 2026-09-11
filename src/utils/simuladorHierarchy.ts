import type { SimulacionCredito, User } from '../types/api';
import { hasPermission, hasRole } from './roles';

export function canVerSimulaciones(user: User | null): boolean {
  return hasPermission(user, 'simulaciones_credito.ver');
}

export function canCrearSimulaciones(user: User | null): boolean {
  return hasPermission(user, 'simulaciones_credito.crear');
}

/** Solo quien la registró puede borrarla (no es un documento oficial como un crédito real). */
export function puedeEliminarSimulacion(actor: User | null, simulacion: SimulacionCredito): boolean {
  if (!hasPermission(actor, 'simulaciones_credito.eliminar')) return false;
  if (hasRole(actor, 'sistemas')) return true;

  const registradoPorId =
    typeof simulacion.registrado_por === 'object'
      ? simulacion.registrado_por?.id
      : simulacion.registrado_por;

  return actor?.id === registradoPorId;
}
