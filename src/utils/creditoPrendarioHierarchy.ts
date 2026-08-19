import type { Bien, BienTipo, CreditoEstado, CreditoPrendario, TipoCuota, User } from '../types/api';
import { hasPermission, hasRole } from './roles';

/**
 * Mirrors the `bienes.*` / `creditos_prendarios.*` / `configuraciones_credito_prendario.*`
 * permission map — gated on `permission_names` (not hardcoded roles) so a
 * change made from the Roles admin page reflects here without a frontend
 * redeploy. 'sistemas' bypasses everything via the backend's before() hook,
 * and getAllPermissions() already includes it in permission_names too.
 */
export function canVerBienes(user: User | null): boolean {
  return hasPermission(user, 'bienes.ver');
}

export function canCrearBienes(user: User | null): boolean {
  return hasPermission(user, 'bienes.crear');
}

/**
 * Mirrors BienPolicy::update() + BienHierarchyService::canManage(), which
 * delegates its fallback branch to ClienteHierarchyService::canView() on the
 * bien's own cliente — a bien is editable by whoever can view its cliente.
 * Structural (mirrors the hierarchy service), not permission-configurable
 * beyond the 'bienes.editar' gate, so it stays role-based like canEditCliente.
 */
export function canEditarBienes(user: User | null): boolean {
  return hasPermission(user, 'bienes.editar');
}

export function canEditBien(actor: User | null, bien: Bien): boolean {
  if (!hasPermission(actor, 'bienes.editar')) return false;
  if (hasRole(actor, 'sistemas')) return true;

  if (hasRole(actor, 'administrador_general', 'secretaria')) {
    return actor?.empresa_id === bien.empresa_id;
  }

  if (hasRole(actor, 'administrador_agencia')) {
    return actor?.agencia_id === bien.agencia_id;
  }

  const cliente = bien.cliente;
  if (!cliente) return false;

  if (hasRole(actor, 'supervisor')) {
    if (cliente.asesor_id == null) return actor?.agencia_id === cliente.agencia_id;
    return cliente.asesor?.supervisor_id === actor?.id;
  }

  if (hasRole(actor, 'asesor')) {
    return cliente.asesor_id === actor?.id;
  }

  return false;
}

export function canVerCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.ver');
}

export function canCrearCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.crear');
}

export function canAprobarCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.aprobar');
}

export function canFirmarCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.firmar');
}

export function canRefrendarCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.refrendar');
}

export function canLiquidarCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.liquidar');
}

export function canVerConfiguracion(user: User | null): boolean {
  return hasPermission(user, 'configuraciones_credito_prendario.ver');
}

/**
 * Mirrors CreditoPrendarioPolicy::aprobar() = can('creditos_prendarios.aprobar')
 * AND CreditoPrendarioHierarchyService::puedeAprobar(). The scope match is
 * structural, not permission-configurable, so it stays role-based.
 */
export function puedeAprobarCredito(actor: User | null, credito: CreditoPrendario): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'creditos_prendarios.aprobar')) return false;
  if (hasRole(actor, 'administrador_agencia')) return actor?.agencia_id === credito.agencia_id;
  if (hasRole(actor, 'administrador_general')) return actor?.empresa_id === credito.empresa_id;
  return false;
}

export const BIEN_TIPO_LABELS: Record<BienTipo, string> = {
  electro: 'Electrodoméstico',
  varios: 'Varios',
};

export const TIPO_CUOTA_LABELS: Record<TipoCuota, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
};

export const CREDITO_ESTADO_LABELS: Record<CreditoEstado, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  activo: 'Activo',
  refrendado: 'Refrendado',
  vencido: 'Vencido',
  en_venta: 'En venta',
  liquidado: 'Liquidado',
};

export const CREDITO_ESTADO_COLOR: Record<
  CreditoEstado,
  'default' | 'warning' | 'success' | 'error' | 'info'
> = {
  pendiente: 'warning',
  aprobado: 'info',
  activo: 'success',
  rechazado: 'error',
  refrendado: 'default',
  vencido: 'error',
  en_venta: 'error',
  liquidado: 'default',
};
