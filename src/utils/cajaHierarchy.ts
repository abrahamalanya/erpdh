import type { Billetaje, Boveda, Caja, User } from '../types/api';
import { hasPermission, hasRole } from './roles';

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
 * Mirrors BovedaPolicy::cerrar() = can('bovedas.cerrar') AND: for
 * administrador_general, full-empresa authority over ANY bóveda (principal
 * or any agencia's) — not just CajaBovedaHierarchyService::puedeControlarBoveda()'s
 * structural match, which only covers administrador_agencia's own agencia.
 */
export function puedeControlarBoveda(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'bovedas.cerrar')) return false;

  if (hasRole(actor, 'administrador_general')) {
    return actor?.empresa_id === boveda.empresa_id;
  }

  return hasRole(actor, 'administrador_agencia') && actor?.agencia_id === boveda.agencia_id;
}

/**
 * Mirrors CajaBovedaHierarchyService::puedeControlarBilletaje() — quién
 * aprueba/rechaza un billetaje: el administrador_agencia de la agencia de
 * su bóveda financiadora y, además, el administrador_general para
 * billetajes de CUALQUIER agencia de su empresa (no solo la principal).
 */
export function puedeControlarBilletaje(actor: User | null, billetaje: Billetaje): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!billetaje.boveda) return false;

  if (hasRole(actor, 'administrador_general')) {
    return actor?.empresa_id === billetaje.boveda.empresa_id;
  }

  return puedeControlarBoveda(actor, billetaje.boveda);
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
 * Mirrors BovedaPolicy::retirar() — el espejo de puedeInyectarBoveda(): retiro
 * externo de la principal o devolución a la principal desde una bóveda de
 * agencia de la misma empresa.
 */
export function puedeRetirarBoveda(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'bovedas.retirar')) return false;

  return hasRole(actor, 'administrador_general') && actor?.empresa_id === boveda.empresa_id;
}

/**
 * Mirrors CajaBovedaHierarchyService::puedeForzarCierre() — the shared
 * authority check reused by both cerrar-forzado and reabrir.
 * administrador_general has full-empresa authority over ANY caja (asesor,
 * supervisor, administrador_agencia — needed so closing another agencia's
 * bóveda can cascade-close every caja it funds), administrador_agencia only
 * over their own agencia's cajas.
 */
function puedeControlarCaja(actor: User | null, caja: Caja): boolean {
  if (hasRole(actor, 'administrador_general')) {
    return actor?.empresa_id === caja.empresa_id;
  }

  const targetRoles = caja.user?.roles?.map((r) => r.name) ?? [];

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
 * Mirrors CuentaBancariaPolicy::crear()/editar()/eliminar()/movimiento()/
 * conciliar() — el administrador_agencia gestiona las cuentas de la bóveda
 * de su agencia y el administrador_general las de CUALQUIER bóveda de su
 * empresa (misma autoridad de empresa completa que ya tiene para verlas).
 * Used to gate the whole "Cuentas bancarias" management panel for a bóveda,
 * not a single action.
 */
export function puedeGestionarCuentasBancarias(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'cuentas_bancarias.ver')) return false;

  if (hasRole(actor, 'administrador_general')) {
    return actor?.empresa_id === boveda.empresa_id;
  }

  return hasRole(actor, 'administrador_agencia') && actor?.agencia_id === boveda.agencia_id;
}

/**
 * Mirrors BovedaPolicy::reabrir() — same authority as cerrar, gated on the
 * bovedas.reabrir permission instead.
 */
export function puedeReabrirBoveda(actor: User | null, boveda: Boveda): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'bovedas.reabrir')) return false;

  if (hasRole(actor, 'administrador_general')) {
    return actor?.empresa_id === boveda.empresa_id;
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
