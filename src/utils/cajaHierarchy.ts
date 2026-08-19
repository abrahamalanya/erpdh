import type { Boveda, Caja, User } from '../types/api';
import { hasPermission, hasRole } from './roles';

const ROLES_PRINCIPAL = ['administrador_general', 'secretaria'];
const ROLES_AGENCIA = ['administrador_agencia', 'supervisor', 'asesor'];

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

/**
 * Mirrors BovedaController::mia()'s role guard — only the roles that
 * control a single bóveda (administrador_general the principal,
 * administrador_agencia their own agencia) have one worth badging in the
 * header. Deliberately excludes 'sistemas' here (unlike most other checks in
 * this file) — bovedaFinanciadoraDe() has no concept of "sistemas's own
 * bóveda" to resolve, and the backend endpoint itself 403s for that role.
 */
export function canAccederBovedaPropia(user: User | null): boolean {
  return hasRole(user, 'administrador_general', 'administrador_agencia');
}

export function canVerCajas(user: User | null): boolean {
  return hasPermission(user, 'cajas.ver');
}

export function canCerrarForzado(user: User | null): boolean {
  return hasPermission(user, 'cajas.cerrar_forzado');
}

export function canReabrirCaja(user: User | null): boolean {
  return hasPermission(user, 'cajas.reabrir');
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
 * Mirrors BovedaPolicy::aperturar() — only administrador_general, only the
 * principal bóveda (the agencia bóveda still opens automatically in cascade,
 * it has no manual apertura of its own).
 */
export function puedeAperturarBoveda(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'bovedas.aperturar')) return false;

  return boveda.tipo === 'principal' && hasRole(actor, 'administrador_general') && actor?.empresa_id === boveda.empresa_id;
}

/**
 * Mirrors BovedaPolicy::inyectar() — administrador_general, same empresa,
 * works for both the principal bóveda (external capital) and any agencia
 * bóveda in the empresa (traspaso from the principal).
 */
export function puedeInyectarBoveda(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'bovedas.inyectar')) return false;

  return hasRole(actor, 'administrador_general') && actor?.empresa_id === boveda.empresa_id;
}

/**
 * Mirrors CajaBovedaHierarchyService::puedeForzarCierre() — the shared
 * authority check reused by both cerrar-forzado and reabrir. Includes the
 * safety-valve special case: administrador_general can always act on an
 * administrador_agencia's OWN caja (even though it's funded by the agencia
 * bóveda that person controls), as an escalation path if they're unavailable.
 */
function puedeControlarCaja(actor: User | null, caja: Caja): boolean {
  const targetRoles = caja.user?.roles?.map((r) => r.name) ?? [];

  if (targetRoles.includes('administrador_agencia') && hasRole(actor, 'administrador_general')) {
    return actor?.empresa_id === caja.empresa_id;
  }

  if (targetRoles.some((r) => ROLES_PRINCIPAL.includes(r))) {
    return hasRole(actor, 'administrador_general') && actor?.empresa_id === caja.empresa_id;
  }

  if (targetRoles.some((r) => ROLES_AGENCIA.includes(r))) {
    return hasRole(actor, 'administrador_agencia') && actor?.agencia_id === caja.agencia_id;
  }

  return false;
}

/**
 * Mirrors CajaPolicy::cerrarForzado() = can('cajas.cerrar_forzado') AND
 * CajaBovedaHierarchyService::puedeForzarCierre() — needs the target caja
 * owner's roles (Caja.user.roles) to know which bóveda funds it.
 */
export function puedeForzarCierre(actor: User | null, caja: Caja): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'cajas.cerrar_forzado')) return false;

  return puedeControlarCaja(actor, caja);
}

/**
 * Mirrors CajaPolicy::reabrir() — same authority as cerrarForzado, gated on
 * the cajas.reabrir permission instead.
 */
export function puedeReabrirCaja(actor: User | null, caja: Caja): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'cajas.reabrir')) return false;

  return puedeControlarCaja(actor, caja);
}

/**
 * Mirrors BovedaPolicy::reabrir() — same authority as cerrar, gated on the
 * bovedas.reabrir permission instead.
 */
export function puedeReabrirBoveda(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'bovedas.reabrir')) return false;

  if (boveda.tipo === 'principal') {
    return hasRole(actor, 'administrador_general') && actor?.empresa_id === boveda.empresa_id;
  }

  return hasRole(actor, 'administrador_agencia') && actor?.agencia_id === boveda.agencia_id;
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
