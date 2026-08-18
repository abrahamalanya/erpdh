import type { User } from '../types/api';
import { hasPermission } from './roles';

/**
 * Mirrors UserHierarchyService::ASSIGNABLE_ROLES on the backend: a fixed
 * ceiling of which roles each actor role may assign to a new user.
 */
const ASSIGNABLE_ROLES: Record<string, string[]> = {
  sistemas: [
    'administrador_general',
    'secretaria',
    'administrador_agencia',
    'supervisor',
    'peinadora',
    'asesor',
  ],
  administrador_general: [
    'secretaria',
    'administrador_agencia',
    'supervisor',
    'peinadora',
    'asesor',
  ],
  secretaria: ['administrador_agencia', 'supervisor', 'peinadora', 'asesor'],
  administrador_agencia: ['supervisor', 'peinadora', 'asesor'],
};

const AGENCIA_LEVEL_ROLES = ['administrador_agencia', 'peinadora', 'supervisor', 'asesor'];

export function assignableRoles(actor: User | null): string[] {
  if (!actor?.roles) return [];

  for (const role of actor.roles) {
    if (ASSIGNABLE_ROLES[role.name]) {
      return ASSIGNABLE_ROLES[role.name];
    }
  }

  return [];
}

export function isAgenciaLevelRole(role: string): boolean {
  return AGENCIA_LEVEL_ROLES.includes(role);
}

export function roleLabel(role: string): string {
  const withSpaces = role.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Mirrors the `usuarios.*` permission map — gated on `permission_names`
 * (not hardcoded roles) so a change made from the Roles admin page
 * reflects here without a frontend redeploy. 'sistemas' bypasses
 * everything via the backend's before() hook, and getAllPermissions()
 * already includes it in permission_names too.
 */
export function canViewUsers(user: User | null): boolean {
  return hasPermission(user, 'usuarios.ver');
}

export function canCreateUsers(user: User | null): boolean {
  return hasPermission(user, 'usuarios.crear');
}

export function canEditUsers(user: User | null): boolean {
  return hasPermission(user, 'usuarios.editar');
}

export function canDeleteUsers(user: User | null): boolean {
  return hasPermission(user, 'usuarios.eliminar');
}
