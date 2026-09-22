import type { ArticuloTipo, FormaVenta, Venta, VentaEstado, User } from '../types/api';
import { hasPermission, hasRole } from './roles';

/**
 * Mirrors VentaPolicy/ConfiguracionVentaPolicy/InteresArticuloPolicy —
 * gated on `permission_names`, scoped by empresa/agencia like the backend
 * (solo administrador_general/administrador_agencia tienen estos permisos,
 * ver PermissionSeeder).
 */
export function canVerVentas(user: User | null): boolean {
  return hasPermission(user, 'ventas.ver');
}

export function canCrearVentas(user: User | null): boolean {
  return hasPermission(user, 'ventas.crear');
}

function puedeAdministrar(actor: User | null, venta: Venta): boolean {
  if (hasRole(actor, 'sistemas')) return true;
  if (hasRole(actor, 'administrador_general')) return actor?.empresa_id === venta.empresa_id;
  if (hasRole(actor, 'administrador_agencia')) return actor?.agencia_id === venta.agencia_id;
  return false;
}

/**
 * Mirrors VentaPolicy::puedeOperar() — un asesor solo opera (ver/cobrar) las
 * ventas que él mismo registró (vendido_por); un admin, las de su
 * agencia/empresa.
 */
function puedeOperar(actor: User | null, venta: Venta): boolean {
  if (hasRole(actor, 'asesor')) {
    const vendidoPorId = typeof venta.vendido_por === 'number' ? venta.vendido_por : venta.vendido_por?.id;
    return vendidoPorId === actor?.id;
  }

  return puedeAdministrar(actor, venta);
}

export function puedeCobrarVenta(actor: User | null, venta: Venta): boolean {
  return hasPermission(actor, 'ventas.cobrar') && puedeOperar(actor, venta);
}

/**
 * Cancelar un apartado hace que el cliente pierda el inicial y los abonos
 * entregados — misma autoridad admin que ConfiguracionVenta, no se
 * extiende a asesor.
 */
export function puedeCancelarVenta(actor: User | null, venta: Venta): boolean {
  return hasPermission(actor, 'ventas.cancelar') && puedeAdministrar(actor, venta);
}

export function canVerConfiguracionVenta(user: User | null): boolean {
  return hasPermission(user, 'configuraciones_venta.ver');
}

export function canVerSolicitudesTienda(user: User | null): boolean {
  return hasPermission(user, 'intereses_tienda.ver');
}

export function canAtenderSolicitudesTienda(user: User | null): boolean {
  return hasPermission(user, 'intereses_tienda.atender');
}

/**
 * Mirrors TiendaProductoController — reusa bienes.editar / vehiculos.editar
 * / inmuebles.editar, permisos que un asesor también tiene (para sus
 * propios bienes registrados). Configurar precio/oferta/estado de la
 * tienda es una decisión de nivel admin, así que además se exige el rol —
 * mismo criterio que "Productos de la tienda" en el menú de la web.
 */
export function canEditarTiendaProducto(user: User | null, tipo: ArticuloTipo): boolean {
  if (!hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia')) return false;

  const permiso: Record<ArticuloTipo, string> = {
    bien: 'bienes.editar',
    vehiculo: 'vehiculos.editar',
    inmueble: 'inmuebles.editar',
  };

  return hasPermission(user, permiso[tipo]);
}

export function canVerTiendaProductos(user: User | null): boolean {
  if (!hasRole(user, 'sistemas', 'administrador_general', 'administrador_agencia')) return false;

  return (
    hasPermission(user, 'bienes.ver') || hasPermission(user, 'vehiculos.ver') || hasPermission(user, 'inmuebles.ver')
  );
}

export const ARTICULO_TIPO_LABELS: Record<ArticuloTipo, string> = {
  bien: 'Bien',
  vehiculo: 'Vehículo',
  inmueble: 'Inmueble',
};

export const FORMA_VENTA_LABELS: Record<FormaVenta, string> = {
  contado: 'Contado',
  credito: 'Crédito',
  apartado: 'Apartado',
};

export const VENTA_ESTADO_LABELS: Record<VentaEstado, string> = {
  activa: 'Activa',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
};

export const VENTA_ESTADO_COLOR: Record<VentaEstado, 'default' | 'warning' | 'success' | 'error'> = {
  activa: 'warning',
  pagada: 'success',
  cancelada: 'error',
};

/**
 * Estado de navegación que TiendaSolicitudesPage manda a VentasPage
 * (`navigate('/ventas', { state })`) al convertir una solicitud "me
 * interesa" en una venta: precarga el artículo y los datos de contacto ya
 * capturados por la solicitud pública (que no está ligada a un Cliente).
 */
export interface VentaPrefillState {
  prefillArticuloTipo: ArticuloTipo;
  prefillArticuloId: number;
  prefillNombre?: string;
  prefillTelefono?: string;
  solicitudId: number;
}
