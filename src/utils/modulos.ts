import type { User } from '../types/api';

/** Mirrors ModuloService::ROLES_RESTRINGIBLES on the backend. */
export const ROLES_RESTRINGIBLES_MODULOS = ['asesor', 'supervisor'];

/** Whether this set of roles can have a per-user módulo override (asesor/supervisor). */
export function isModuloRestringibleRole(roles: string[]): boolean {
  return roles.some((r) => ROLES_RESTRINGIBLES_MODULOS.includes(r));
}

/**
 * Whether the authenticated user currently has this módulo — from
 * modulos_efectivos (resolved: their own override, else their role's
 * default; 'sistemas' has every módulo). Only present on the logged-in
 * user's own object (from /auth/login or /auth/me), so this is for nav
 * filtering, not for checking some other user.
 */
export function tieneModulo(user: User | null, modulo: string): boolean {
  return user?.modulos_efectivos?.includes(modulo) ?? false;
}
