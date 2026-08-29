import type { Bien, BienEstado, BienTipo, CreditoEstado, CreditoPrendario, TipoCuota, User } from '../types/api';
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

function registradoPorId(credito: CreditoPrendario): number | null {
  const value = credito.registrado_por;
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : value.id;
}

/**
 * Mirrors CreditoPrendarioPolicy::subsanar() — ONLY the asesor who
 * registered the crédito, never the admin who rejected it (confirmed
 * explicitly: they asked for the fix, they don't perform it). Deliberately
 * an ownership check, not puedeVer()'s broader visibility scope.
 */
export function puedeSubsanarCredito(actor: User | null, credito: CreditoPrendario): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'creditos_prendarios.subsanar')) return false;
  return registradoPorId(credito) === actor?.id;
}

/**
 * Mirrors CreditoPrendarioPolicy::verDocumento() — an asesor can't open the
 * generated contrato/declaración until the crédito is aprobado or later;
 * reverting the approval back to pendiente hides them again since this is
 * purely state-based. Every other role that can see the crédito keeps
 * seeing documentos regardless of estado.
 */
export function puedeVerDocumentosCredito(actor: User | null, credito: CreditoPrendario): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasRole(actor, 'asesor')) return true;
  return credito.estado !== 'pendiente' && credito.estado !== 'rechazado';
}

export function canDesembolsarCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.desembolsar');
}

export function canRefrendarCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.refrendar');
}

export function canLiquidarCreditos(user: User | null): boolean {
  return hasPermission(user, 'creditos_prendarios.liquidar');
}

/**
 * Mirrors CreditoPrendarioPolicy::adendar() — same admin-level authority as
 * puedeEditarCredito() (an adenda modifies the tasa de interés, the same
 * sensitive change editar() already gates to admins only).
 */
export function puedeAdendarCredito(actor: User | null, credito: CreditoPrendario): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'creditos_prendarios.adendar')) return false;
  if (hasRole(actor, 'administrador_agencia')) return actor?.agencia_id === credito.agencia_id;
  if (hasRole(actor, 'administrador_general')) return actor?.empresa_id === credito.empresa_id;
  return false;
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

/**
 * Mirrors CreditoPrendarioPolicy::revertirAprobacion() — same authority as
 * aprobar/rechazar (any admin who could approve this crédito can also fix a
 * mistaken approval), not restricted to whoever specifically approved it.
 */
export function puedeRevertirAprobacion(actor: User | null, credito: CreditoPrendario): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'creditos_prendarios.revertir_aprobacion')) return false;
  if (hasRole(actor, 'administrador_agencia')) return actor?.agencia_id === credito.agencia_id;
  if (hasRole(actor, 'administrador_general')) return actor?.empresa_id === credito.empresa_id;
  return false;
}

/**
 * Mirrors the `creditos_prendarios.editar` gate CreditoPrendarioController::store()
 * enforces when `interes` is sent at creation time — no crédito exists yet
 * so there's no agencia/empresa scope to check, just the raw permission.
 */
export function canEditarInteresCredito(actor: User | null): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  return hasPermission(actor, 'creditos_prendarios.editar');
}

/**
 * Mirrors CreditoPrendarioPolicy::editar() — same authority as aprobar.
 */
export function puedeEditarCredito(actor: User | null, credito: CreditoPrendario): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'creditos_prendarios.editar')) return false;
  if (hasRole(actor, 'administrador_agencia')) return actor?.agencia_id === credito.agencia_id;
  if (hasRole(actor, 'administrador_general')) return actor?.empresa_id === credito.empresa_id;
  return false;
}

/**
 * Mirrors CreditoPrendarioPolicy::enviarATienda() — same admin-level
 * authority as aprobar/editar/revertirAprobacion. Only checks who's allowed
 * to perform the action; whether the crédito has actually surpassed
 * dias_espera_mora is a separate check (see diasEnMora() usage in
 * CreditosPrendariosPage) since that's a business-rule gate, not authority.
 */
export function puedeEnviarATiendaCredito(actor: User | null, credito: CreditoPrendario): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (!hasPermission(actor, 'creditos_prendarios.enviar_tienda')) return false;
  if (hasRole(actor, 'administrador_agencia')) return actor?.agencia_id === credito.agencia_id;
  if (hasRole(actor, 'administrador_general')) return actor?.empresa_id === credito.empresa_id;
  return false;
}

export const BIEN_TIPO_LABELS: Record<BienTipo, string> = {
  electro: 'Electrodoméstico',
  varios: 'Varios',
};

export const BIEN_ESTADO_LABELS: Record<BienEstado, string> = {
  en_garantia: 'En garantía',
  recuperado: 'Recuperado',
  disponible_venta: 'Disponible para venta',
};

/** `disponible_venta` (en venta) gets a distinct color so it stands out in listings. */
export const BIEN_ESTADO_COLOR: Record<BienEstado, 'default' | 'success' | 'info'> = {
  en_garantia: 'success',
  recuperado: 'default',
  disponible_venta: 'info',
};

export const TIPO_CUOTA_LABELS: Record<TipoCuota, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
};

/** Mirrors CreditoPrendarioService::CUOTAS_POR_TIPO — tabla fija, no depende de plazo_dias. */
export const CUOTAS_POR_TIPO: Record<TipoCuota, number> = {
  diario: 30,
  semanal: 4,
  quincenal: 2,
  mensual: 1,
};

export const CREDITO_ESTADO_LABELS: Record<CreditoEstado, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  activo: 'Activo',
  refrendado: 'Refrendado',
  adendado: 'Adendado',
  vencido: 'Vencido',
  en_venta: 'En venta',
  liquidado_pendiente: 'Liquidado (falta firmar acta)',
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
  adendado: 'default',
  vencido: 'error',
  en_venta: 'info',
  liquidado_pendiente: 'warning',
  liquidado: 'default',
};
