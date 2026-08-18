import type { Boveda, Caja, User } from '../types/api';
import { hasPermission, hasRole } from './roles';

const ROLES_PRINCIPAL = ['administrador_general', 'secretaria', 'administrador_agencia'];
const ROLES_AGENCIA = ['supervisor', 'asesor'];

/**
 * Mirrors the `cajas.*` / `bovedas.*` / `billetajes.*` permission map —
 * gated on `permission_names` (not hardcoded roles) so a change made from
 * the Roles admin page reflects here without a frontend redeploy.
 * 'sistemas' bypasses everything via the backend's before() hook, and
 * getAllPermissions() already includes 'sistemas' in permission_names too.
 */
export function canAccederCajaPropia(user: User | null): boolean {
  return hasPermission(user, 'cajas.aperturar', 'cajas.cerrar');
}

export function canSolicitarBilletaje(user: User | null): boolean {
  return hasPermission(user, 'billetajes.crear');
}

export function canVerCajas(user: User | null): boolean {
  return hasPermission(user, 'cajas.ver');
}

export function canCerrarForzado(user: User | null): boolean {
  return hasPermission(user, 'cajas.cerrar_forzado');
}

export function canVerBovedas(user: User | null): boolean {
  return hasPermission(user, 'bovedas.ver');
}

export function canVerBilletajes(user: User | null): boolean {
  return hasPermission(user, 'billetajes.ver');
}

/**
 * Mirrors BovedaPolicy::cerrar() = can('bovedas.cerrar') AND
 * CajaBovedaHierarchyService::puedeControlarBoveda(). The scope match
 * (which admin level controls which bóveda type) is structural, not
 * permission-configurable, so it stays role-based like the backend.
 */
export function puedeControlarBoveda(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'bovedas.cerrar')) return false;

  if (boveda.tipo === 'principal') {
    return hasRole(actor, 'administrador_general') && actor?.empresa_id === boveda.empresa_id;
  }

  return hasRole(actor, 'administrador_agencia') && actor?.agencia_id === boveda.agencia_id;
}

/**
 * Mirrors CajaPolicy::cerrarForzado() = can('cajas.cerrar_forzado') AND
 * CajaBovedaHierarchyService::puedeForzarCierre() — needs the target caja
 * owner's roles (Caja.user.roles) to know which bóveda funds it.
 */
export function puedeForzarCierre(actor: User | null, caja: Caja): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'cajas.cerrar_forzado')) return false;

  const targetRoles = caja.user?.roles?.map((r) => r.name) ?? [];

  if (targetRoles.some((r) => ROLES_PRINCIPAL.includes(r))) {
    return hasRole(actor, 'administrador_general') && actor?.empresa_id === caja.empresa_id;
  }

  if (targetRoles.some((r) => ROLES_AGENCIA.includes(r))) {
    return hasRole(actor, 'administrador_agencia') && actor?.agencia_id === caja.agencia_id;
  }

  return false;
}

/**
 * Several relations here (solicitadoPor, aprobadoPor, cerradaPor...)
 * serialize under the same snake_case key as their raw FK column, so the
 * field is a nested User when eager-loaded and a raw id otherwise.
 */
export function extractUserName(value: number | User | null | undefined): string | null {
  if (value === null || value === undefined || typeof value === 'number') return null;
  return `${value.nombre} ${value.apellido}`;
}
