import type { Cliente, User } from '../types/api';
import { hasPermission, hasRole } from './roles';

/**
 * Mirrors ClientePolicy: viewAny/create/delete are pure permission checks
 * on the backend, so these gate purely on `permission_names` — no
 * hardcoded role list to keep in sync when Roles/Permisos changes.
 */
export function canViewClientes(user: User | null): boolean {
  return hasPermission(user, 'clientes.ver');
}

export function canCreateClientes(user: User | null): boolean {
  return hasPermission(user, 'clientes.crear');
}

function registradoPorId(cliente: Cliente): number | null {
  const value = cliente.registrado_por;
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : value.id;
}

/**
 * Mirrors ClientePolicy::update() + ClienteHierarchyService::canManage(),
 * which falls back to canView() for every role except 'peinadora'. Requires
 * 'clientes.editar', then applies the same ownership rule per role as the
 * backend — this is structural (mirrors the hierarchy service), not
 * permission-configurable, so it stays role-based.
 */
export function canEditCliente(user: User | null, cliente: Cliente): boolean {
  if (!hasPermission(user, 'clientes.editar')) return false;

  if (hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia')) {
    return true;
  }

  if (hasRole(user, 'peinadora')) {
    return registradoPorId(cliente) === user?.id && !cliente.asesor_id;
  }

  if (hasRole(user, 'supervisor')) {
    if (cliente.asesor_id == null) return user?.agencia_id === cliente.agencia_id;
    return cliente.asesor?.supervisor_id === user?.id;
  }

  if (hasRole(user, 'asesor')) {
    return cliente.asesor_id === user?.id;
  }

  return false;
}

export function canDeleteClientes(user: User | null): boolean {
  return hasPermission(user, 'clientes.eliminar');
}

export function canAsignarClientes(user: User | null): boolean {
  return hasPermission(user, 'clientes.asignar');
}

export const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  dni: 'DNI',
  ce: 'CE',
  pasaporte: 'Pasaporte',
};
