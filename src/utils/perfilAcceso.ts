import type { User } from '../types/api';
const RUTAS: Record<string, string> = {
  "/empresas": "empresas",
  "/agencias": "agencias",
  "/usuarios": "usuarios",
  "/clientes": "clientes",
  "/gestion/permisos-temporales": "permisos_temporales",
  "/planilla": "planilla",
  "/caja": "mi_caja",
  "/cajas": "cajas",
  "/cierre-caja": "cajas",
  "/bovedas": "bovedas",
  "/billetajes": "billetajes",
  "/ingresos": "movimientos",
  "/egresos": "movimientos",
  "/desembolsos": "movimientos",
  "/conceptos": "conceptos",
  "/creditos-prendarios/prendarios": "prendario",
  "/creditos-prendarios/diarios": "diario",
  "/creditos-prendarios/vehiculares": "vehicular",
  "/creditos-prendarios/hipotecarios": "hipotecario",
  "/creditos-prendarios": "solicitudes",
  "/cobros": "cobranzas",
  "/ruta-cobranza": "ruta_cobranza",
  "/simulador-creditos": "simulador",
  "/bienes": "bienes",
  "/vehiculos": "vehiculos",
  "/inmuebles": "inmuebles",
  "/configuraciones-credito-prendario": "configuracion_creditos",
  "/ventas": "ventas",
  "/configuraciones-venta": "configuracion_ventas",
  "/tienda-solicitudes": "tienda_solicitudes",
  "/tienda-productos": "tienda_productos",
  "/facturacion": "facturacion",
  "/reportes/movimientos-dinero": "reportes_movimientos",
  "/reportes/cobranza-diaria": "reportes_cobranza",
  "/reportes/anulaciones-cobranza": "reportes_cobranza",
  "/reportes/cajas-apertura-cierre": "reportes_cajas",
  "/reportes/cobranza-mensual": "reportes_cobranza_mensual",
  "/reportes/flujo-caja": "reportes_flujo_caja",
  "/reportes/ingresos-egresos": "reportes_ingresos_egresos",
  "/reportes/cumpleanos": "reportes_cumpleanos",
  "/reportes/atrasos-diarios": "reportes_atrasos",
  "/reportes/planilla": "reportes_planilla"
};
export function perfilPermite(user: User | null, ...modulos: string[]): boolean {
  return !!user && (user.roles?.some(r => r.name === 'sistemas') || user.perfil_acceso_id == null || modulos.some(m => user.modulos_efectivos?.includes(m)));
}
export function perfilPermiteRuta(user: User | null, path: string): boolean {
  if (path === '/') return !!user;
  if (path === '/cierre-caja') return perfilPermite(user, 'cajas', 'mi_caja');
  if (['/roles', '/configuracion-sistema', '/bancos', '/perfiles-acceso', '/modulos', '/actualizaciones-apk'].includes(path)) return !!user?.roles?.some(r => r.name === 'sistemas');
  if (path === '/qr') return !!user?.roles?.some(r => r.name === 'sistemas' || r.name === 'administrador_general');
  const route = Object.keys(RUTAS).sort((a, b) => b.length - a.length).find(r => path === r || path.startsWith(r + '/'));
  return route ? perfilPermite(user, RUTAS[route]) : user?.perfil_acceso_id == null;
}
