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

export function tieneEdicionTemporalCliente(user: User | null, clienteId: number): boolean {
  return (user?.permisos_temporales_clientes ?? []).some(
    (permiso) => permiso.cliente_id === clienteId && new Date(permiso.expira_at).getTime() > Date.now()
  );
}

function tieneEdicionTemporal(user: User | null, cliente: Cliente): boolean {
  if (!user || cliente.asesor_id !== user.id) return false;

  return tieneEdicionTemporalCliente(user, cliente.id);
}

/**
 * Mirrors ClientePolicy::update() + ClienteHierarchyService::canManage().
 * Los asesores ya no tienen clientes.editar por rol: solo pueden abrir el
 * cliente concreto que aparece en una concesión temporal vigente. Los demás
 * roles conservan la autorización estática y la jerarquía existente.
 */
export function canEditCliente(user: User | null, cliente: Cliente): boolean {
  if (!user) return false;

  if (hasRole(user, 'asesor') && !hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia', 'peinadora')) {
    return tieneEdicionTemporal(user, cliente);
  }

  if (!hasPermission(user, 'clientes.editar')) return false;

  if (hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia')) {
    return true;
  }

  if (hasRole(user, 'peinadora')) {
    return registradoPorId(cliente) === user.id && !cliente.asesor_id;
  }

  if (hasRole(user, 'supervisor')) {
    if (cliente.asesor_id == null) return user.agencia_id === cliente.agencia_id;
    return cliente.asesor?.supervisor_id === user.id;
  }

  if (hasRole(user, 'asesor')) {
    return cliente.asesor_id === user.id;
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
