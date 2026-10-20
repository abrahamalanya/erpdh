export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type Estado = 'activo' | 'inactivo';

/**
 * Generic shape for every notification type — a new notification only needs
 * to include `mensaje` (shown in the bell) and, optionally, `url` (where
 * clicking it navigates to) in its `data` payload for the frontend to render
 * it with no changes.
 */
export interface Notificacion {
  id: string;
  type: string;
  data: {
    mensaje: string;
    url?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
}

export interface ConfiguracionSistema {
  id: number;
  nombre_app: string;
  favicon_url: string | null;
}

export interface Role {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
}

export interface Modulo {
  id: number;
  key: string;
  nombre: string;
  grupo: string | null;
}

export interface PermisoTemporalCliente {
  id: number;
  empresa_id: number;
  usuario_id: number | null;
  cliente_id: number | null;
  permiso: string;
  motivo: string;
  concedido_por: number | null;
  concedido_at: string;
  expira_at: string;
  revocado_at: string | null;
  revocado_por: number | null;
  motivo_revocacion: string | null;
  estado: 'vigente' | 'expirado' | 'revocado';
  cliente?: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'numero_documento' | 'asesor_id' | 'asesor'> | null;
  usuario?: User | null;
  concedido_por_usuario?: User | null;
  revocado_por_usuario?: User | null;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  guard_name: string;
  permissions: Permission[];
  modulos: Modulo[];
}

export interface ApkVersion {
  id: number;
  application_id: string;
  version: string;
  build_number: number;
  descripcion: string | null;
  file_name: string;
  file_size: number;
  sha256: string;
  publicada: boolean;
  publicada_at: string | null;
  created_at: string;
  subido_por: number | null;
}

export interface Empresa {
  id: number;
  nombre: string;
  prefijo?: string | null;
  ruc?: string | null;
  razon_social?: string | null;
  domicilio_legal?: string | null;
  actividad_economica?: string | null;
  representante_legal?: string | null;
  /** Firma los documentos de cobranza hipotecaria (aviso prejudicial). */
  apoderado_legal?: string | null;
  /** Celular de contacto que aparece en la notificación / requerimiento de pago. */
  celular_cobranzas?: string | null;
  logo_url?: string | null;
  firma_url?: string | null;
  estado: Estado;
}

export interface Agencia {
  id: number;
  empresa_id: number;
  nombre: string;
  estado: Estado;
  empresa?: Empresa;
}

/** Régimen de planilla del trabajador. */
export type SistemaPension = 'afp' | 'onp';
export type SeguroSalud = 'essalud' | 'sis';

export interface User {
  perfil_acceso_id?: number | null;
  perfil_acceso?: { id: number; nombre: string; activo: boolean } | null;
  id: number;
  nombre: string;
  apellido: string;
  dni?: string | null;
  telefono?: string | null;
  email: string;
  estado: string;
  empresa_id?: number | null;
  agencia_id?: number | null;
  supervisor_id?: number | null;
  /** This user's own override (null = none, inherits their role's default módulos). Solo aplica a asesor/supervisor. */
  modulos?: string[] | null;
  /** Resolved módulos (override, else role default; 'sistemas' gets all) — only on /auth/login and /auth/me. */
  modulos_efectivos?: string[];
  /** Concesiones temporales de edición de clientes que siguen vigentes para este asesor. */
  permisos_temporales_clientes?: Array<{ id: number; cliente_id: number; expira_at: string }>;
  fecha_nacimiento?: string | null;
  direccion?: string | null;
  ubigeo_distrito_id?: number | null;
  /** Derivados de ubigeoDistrito en el backend — solo lectura. */
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  referencia?: string | null;
  /** Cast `decimal:7` en el backend, por eso llegan como string. */
  latitud?: string | null;
  longitud?: string | null;
  /** URLs públicas derivadas de las columnas `foto_path` / `qr_yape_path`. */
  foto_url?: string | null;
  qr_yape_url?: string | null;
  roles?: Role[];
  /** Effective permission names via roles, returned by /auth/login and /auth/me only. */
  permission_names?: string[];
  empresa?: Empresa | null;
  agencia?: Agencia | null;
  en_planilla?: boolean;
  sistema_pension?: SistemaPension | null;
  seguro_salud?: SeguroSalud | null;
}

export interface LoginData {
  user: User;
  access_token: string;
  token_type: string;
}

export type TipoDocumento = 'dni' | 'ce' | 'pasaporte';

export interface ConsultaDniResult {
  numero_documento: string;
  nombre: string;
  apellido: string;
  direccion: string | null;
}

export interface Cliente {
  id: number;
  empresa_id: number;
  agencia_id: number;
  asesor_id?: number | null;
  /**
   * Raw FK id on store/update responses; a nested User object on
   * index/show, since Laravel serializes the `registradoPor` relation
   * under the same snake_case key as the column.
   */
  registrado_por?: number | User | null;
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  fecha_nacimiento?: string | null;
  sexo?: 'm' | 'f' | null;
  estado_civil?: string | null;
  email?: string | null;
  /** Calculado en el backend desde fecha_nacimiento — solo lectura. */
  edad?: number | null;
  /** Número de WhatsApp del cliente, único. */
  whatsapp?: string | null;
  direccion?: string | null;
  ubigeo_distrito_id?: number | null;
  /** Derivados de ubigeo_distrito en el backend — solo lectura. */
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  referencia?: string | null;
  latitud?: string | null;
  longitud?: string | null;
  /** Dirección del negocio/trabajo del cliente — mismo shape que la de casa, opcional. */
  direccion_negocio?: string | null;
  ubigeo_distrito_negocio_id?: number | null;
  distrito_negocio?: string | null;
  provincia_negocio?: string | null;
  departamento_negocio?: string | null;
  referencia_negocio?: string | null;
  latitud_negocio?: string | null;
  longitud_negocio?: string | null;
  foto_cliente_url?: string | null;
  foto_dni_url?: string | null;
  foto_dni_reverso_url?: string | null;
  foto_suministro_url?: string | null;
  foto_recibo_luz_url?: string | null;
  /** Fotos múltiples (casa, negocio, adicionales) — vienen ordenadas por `orden`. */
  fotos?: ClienteFoto[];
  /** Teléfonos múltiples del cliente, distintos del WhatsApp — vienen ordenados por `orden`. */
  telefonos?: ClienteTelefono[];
  estado: Estado;
  agencia?: Agencia;
  asesor?: User | null;
}

/** Tope de números por cliente que valida el backend (`ClienteTelefono::MAX_POR_CLIENTE`). */
export const CLIENTE_TELEFONOS_MAX = 5;

/** Una fila de `cliente_telefonos`: un número del juego múltiple del cliente. */
export interface ClienteTelefono {
  id: number;
  cliente_id: number;
  numero: string;
  orden: number;
}

/** Grupos de fotos múltiples del cliente — mapea a `cliente_fotos.tipo`. */
export type ClienteFotoTipo = 'casa' | 'negocio' | 'adicionales';

/** Todos los tipos, en el mismo orden que `ClienteFoto::TIPOS` del backend. */
export const CLIENTE_FOTO_TIPOS: ClienteFotoTipo[] = ['casa', 'negocio', 'adicionales'];

/** Tope por tipo que valida el backend (`ClienteFoto::MAX_POR_TIPO`). */
export const CLIENTE_FOTOS_MAX_POR_TIPO = 10;

/** Una fila de `cliente_fotos`: una imagen del juego múltiple del cliente. */
export interface ClienteFoto {
  id: number;
  cliente_id: number;
  tipo: ClienteFotoTipo;
  path: string;
  orden: number;
  url: string;
}

export type CicloEstado = 'abierta' | 'cerrada';
export type BilletajeEstado = 'pendiente' | 'aprobado' | 'rechazado';
export type BovedaTipo = 'principal' | 'agencia';

export type ConceptoTipo = 'ingreso' | 'gasto';

export interface Concepto {
  id: number;
  empresa_id: number;
  tipo: ConceptoTipo;
  nombre: string;
  activo: boolean;
  creado_por?: number | User | null;
  empresa?: Empresa;
}

export type MovimientoFotoTipo = 'comprobante' | 'adicional';

export interface MovimientoFoto {
  id: number;
  tipo: MovimientoFotoTipo;
  path: string;
  orden: number;
  url: string;
}

export type CajaMovimientoTipo = 'ingreso' | 'egreso' | 'billetaje';

export interface CajaMovimiento {
  id: number;
  caja_ciclo_id: number;
  empresa_id: number;
  tipo: CajaMovimientoTipo;
  monto: string;
  /** 'efectivo' (default) or 'cuenta_bancaria' — a billetaje approved via yape/plin/transferencia lands here as 'cuenta_bancaria' and doesn't count toward saldo_efectivo. */
  medio?: 'efectivo' | 'cuenta_bancaria';
  canal?: string | null;
  concepto: string;
  descripcion?: string | null;
  concepto_id?: number | null;
  billetaje_id?: number | null;
  credito_id?: number | null;
  credito?: {
    id: number;
    codigo: string;
    tipo_credito: TipoCredito;
    cliente_id: number;
    fecha_desembolso?: string | null;
    cliente?: Pick<Cliente, 'id' | 'nombre' | 'apellido' | 'numero_documento'>;
  } | null;
  registrado_por?: number | User | null;
  fecha_caja: string;
  created_at?: string;
  fotos?: MovimientoFoto[];
}

export interface CajaCiclo {
  id: number;
  caja_id: number;
  empresa_id: number;
  fecha: string;
  estado: CicloEstado;
  saldo_apertura: string;
  saldo_calculado_cierre?: string | null;
  saldo_efectivo_cierre?: string | null;
  saldo_arqueo_cierre?: string | null;
  diferencia?: string | null;
  cerrada_por?: number | User | null;
  cierre_forzado: boolean;
  cierre_automatico?: boolean;
  abierta_at?: string | null;
  cerrada_at?: string | null;
  /** Only present on the GET /caja/cierre/resumen response. */
  movimientos?: CajaMovimiento[];
  /** Only present on the GET /caja/cierre/resumen response — same as saldoActual() would return (includes digital billetaje). */
  saldo_calculado?: string;
  /** Only present on the GET /caja/cierre/resumen response — physical-cash-only balance; what monto_contado should match. */
  saldo_efectivo?: string;
}

export interface Caja {
  id: number;
  user_id: number;
  empresa_id: number;
  agencia_id?: number | null;
  user?: User;
  agencia?: Agencia | null;
  ciclo_abierto?: CajaCiclo | null;
  /** Computed on the fly by the backend, only present while ciclo_abierto is set. */
  saldo_actual?: string | null;
}

export interface BovedaCiclo {
  id: number;
  boveda_id: number;
  empresa_id: number;
  fecha: string;
  estado: CicloEstado;
  saldo_apertura: string;
  saldo_calculado_cierre?: string | null;
  saldo_arqueo_cierre?: string | null;
  diferencia?: string | null;
  /** Computed on the fly by the backend (saldo_apertura + ingresos - egresos), only present while the ciclo is open. */
  saldo_actual?: string;
  abierta_por?: number | User | null;
  cerrada_por?: number | User | null;
  abierta_at?: string | null;
  cerrada_at?: string | null;
}

export interface Boveda {
  id: number;
  empresa_id: number;
  agencia_id?: number | null;
  tipo: BovedaTipo;
  empresa?: Empresa;
  agencia?: Agencia | null;
  ciclo_abierto?: BovedaCiclo | null;
  /** Computed on the fly by the backend — sum of active cuentas bancarias' saldoActual(). */
  saldo_cuentas_bancarias?: string;
  /** Computed on the fly by the backend — ciclo_abierto.saldo_actual (efectivo) + saldo_cuentas_bancarias. */
  saldo_total?: string;
}

/** One caja BovedaService::detalleCierre() would force-close, with the cash it would hand over. */
export interface BovedaCierreDetalleCaja {
  caja_id: number;
  user: User;
  saldo_efectivo: string;
}

/** GET /bovedas/{id}/cierre/detalle — preview of a cerrar-forzado before it runs. */
export interface BovedaCierreDetalle {
  saldo_boveda_actual: string;
  cajas: BovedaCierreDetalleCaja[];
  total_cajas: string;
  total_estimado_cierre: string;
}

export interface Banco {
  id: number;
  nombre: string;
  activo: boolean;
}

export type CuentaBancariaTipo = 'ahorro' | 'corriente';
export type Moneda = 'PEN' | 'USD';

export interface CuentaBancaria {
  id: number;
  boveda_id: number;
  empresa_id: number;
  banco_id: number;
  numero_cuenta: string;
  titular: string;
  tipo_cuenta?: CuentaBancariaTipo | null;
  moneda: Moneda;
  alias?: string | null;
  activa: boolean;
  acepta_yape: boolean;
  numero_yape?: string | null;
  acepta_plin: boolean;
  numero_plin?: string | null;
  saldo_inicial: string;
  creada_por?: number | User | null;
  banco?: Banco;
  boveda?: Boveda;
  /** Computed on the fly by the backend (saldo_inicial + ingresos - egresos). */
  saldo_actual?: string;
}

export type CuentaBancariaMovimientoTipo = 'ingreso' | 'egreso';

export interface CuentaBancariaMovimiento {
  id: number;
  cuenta_bancaria_id: number;
  empresa_id: number;
  tipo: CuentaBancariaMovimientoTipo;
  monto: string;
  concepto?: string | null;
  registrado_por?: number | User | null;
  fecha: string;
}

export interface ConciliacionBancaria {
  id: number;
  cuenta_bancaria_id: number;
  empresa_id: number;
  saldo_sistema: string;
  saldo_banco: string;
  diferencia: string;
  observacion?: string | null;
  conciliado_por?: number | User | null;
  fecha: string;
}

export type BovedaMovimientoTipo = 'ingreso' | 'egreso';

export interface BovedaMovimiento {
  id: number;
  boveda_ciclo_id: number;
  empresa_id: number;
  tipo: BovedaMovimientoTipo;
  monto: string;
  concepto: string;
  origen?: string | null;
  registrado_por?: number | User | null;
  fecha_boveda: string;
}

export type MedioInyeccion = 'efectivo' | 'cuenta_bancaria';

/** One row of BovedaService::reporteInyecciones() — a normalized cash or cuenta bancaria inyección/traspaso. */
export interface InyeccionReporteItem {
  id: number;
  medio: MedioInyeccion;
  tipo: BovedaMovimientoTipo;
  monto: string;
  concepto: string | null;
  origen: string | null;
  fecha: string;
  registrado_por?: number | User | null;
  cuenta_bancaria: CuentaBancaria | null;
  comprobante_url: string | null;
  puede_eliminar: boolean;
}

/** One row of ReporteMovimientosService::movimientosDinero() — every movimiento (not just inyección/traspaso) across every bóveda visible to the actor. */
export interface MovimientoReporteItem {
  id: number;
  medio: MedioInyeccion;
  tipo: BovedaMovimientoTipo;
  monto: string;
  concepto: string | null;
  origen: string | null;
  fecha: string;
  registrado_por?: number | User | null;
  boveda: string;
  cuenta_bancaria: CuentaBancaria | null;
  comprobante_url: string | null;
}

/** Una de las 3 formas de calcular cuánto se le debe cobrar hoy a un cliente. */
export interface MontoSugerido {
  interes?: string;
  mora: string;
  total: string;
}

/** Una cuota dentro del preview de pagar-cuotas de un crédito diario. */
export interface CuotaPagoPreview {
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_total: string;
  mora: string;
  /** Lo que este pago abona a la cuota (su saldo completo si `completa`). */
  abono: string;
  /** Lo que le queda por pagar a la cuota después de este pago. */
  saldo_restante: string;
  /** false = la cuota queda con un abono parcial (adelanto), no pagada. */
  completa: boolean;
}

/**
 * Preview/resultado de pagar un crédito diario, por N cuotas o por monto
 * (amortización) — ver CreditoService::calcularMontoPagoCuotasDiario() y
 * calcularAmortizacionDiario().
 */
export interface MontoPagoCuotasSugerido {
  cuotas: CuotaPagoPreview[];
  monto_cuotas: string;
  mora: string;
  total: string;
  /** Solo hay vuelto en modo monto si supera toda la deuda pendiente. */
  vuelto: string;
  es_ultima_cuota: boolean;
}

export interface MontoPagoCuotaSugerido {
  numero_cuota: number;
  monto_capital: string;
  monto_interes: string;
  cuota_total: string;
  mora: string;
  total: string;
}

/** Una fila de /reportes/cobranza-diaria — un cliente con un crédito suyo que tiene una cuota vencida u hoy. */
export interface CobranzaDiariaItem {
  credito_id: number;
  credito_codigo: string;
  tipo_credito: TipoCredito;
  tipo_interes: 'simple' | 'compuesto';
  estado: CreditoEstado;
  cliente: Cliente;
  agencia: Agencia;
  monto_prestamo: string;
  cuotas_vencidas: number;
  fecha_cuota_mas_antigua: string;
  dias_atraso: number;
  vence_hoy: boolean;
  monto_refrendo_sugerido: MontoSugerido | null;
  monto_liquidacion_sugerido: MontoSugerido | null;
  monto_pago_cuota_sugerido: MontoPagoCuotaSugerido | null;
  monto_pago_cuotas_sugerido: MontoPagoCuotasSugerido | null;
}

/** Un día de /reportes/cobranza-mensual (cobranza) — total_cobrado es 0 para días sin cobranza. */
export interface CobranzaMensualItem {
  dia: number;
  total_cobrado: number;
}

/** Un día de /reportes/cobranza-mensual (desembolsos) — total_desembolsado es 0 para días sin desembolsos. */
export interface DesembolsoMensualItem {
  dia: number;
  total_desembolsado: number;
}

/** Comparación entre asesores de /reportes/cobranza-mensual(/anual) — solo asesores con movimientos, sin relleno de 0. */
export interface CobranzaPorAsesorItem {
  asesor_id: number;
  asesor_nombre: string;
  total_cobrado: number;
}

export interface DesembolsoPorAsesorItem {
  asesor_id: number;
  asesor_nombre: string;
  total_desembolsado: number;
}

/** Respuesta de /reportes/cobranza-mensual: ambos gráficos comparten los mismos filtros (mes/empresa/agencia/asesor). */
export interface ReporteCobranzaMensual {
  cobranza: CobranzaMensualItem[];
  desembolsos: DesembolsoMensualItem[];
  cobranzaPorAsesor: CobranzaPorAsesorItem[];
  desembolsosPorAsesor: DesembolsoPorAsesorItem[];
}

/** Un mes de /reportes/cobranza-mensual/anual (cobranza) — total_cobrado es 0 para meses sin cobranza. */
export interface CobranzaAnualItem {
  mes: number;
  total_cobrado: number;
}

/** Un mes de /reportes/cobranza-mensual/anual (desembolsos) — total_desembolsado es 0 para meses sin desembolsos. */
export interface DesembolsoAnualItem {
  mes: number;
  total_desembolsado: number;
}

/** Respuesta de /reportes/cobranza-mensual/anual: resumen de enero a diciembre del año filtrado. */
export interface ReporteCobranzaAnual {
  cobranza: CobranzaAnualItem[];
  desembolsos: DesembolsoAnualItem[];
  cobranzaPorAsesor: CobranzaPorAsesorItem[];
  desembolsosPorAsesor: DesembolsoPorAsesorItem[];
}

/**
 * Una fila de /reportes/cajas-apertura-cierre — un CajaCiclo (una apertura,
 * y su cierre si ya ocurrió). Los 5 totales son mutuamente excluyentes: ver
 * ReporteCajasService::aperturasCierres() en el backend.
 */
export interface CajaAperturaCierreItem {
  id: number;
  caja_id: number;
  fecha: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  usuario: User | null;
  agencia: string;
  estado: CicloEstado;
  cierre_forzado: boolean;
  cierre_automatico: boolean;
  cerrada_por: User | null;
  valor_aperturado: string;
  /** Null mientras el ciclo sigue abierto (todavía no hay arqueo). */
  valor_cerrado: string | null;
  saldo_efectivo_cierre: string | null;
  diferencia: string | null;
  total_ingresos: string;
  total_egresos: string;
  total_billetaje: string;
  total_cobranza: string;
  total_desembolso: string;
}

export interface CajaLineaBilletaje {
  id: number;
  fecha: string | null;
  motivo: string | null;
  monto: string;
  medio_recepcion: MedioRecepcionBilletaje | null;
  datos_recepcion: string | null;
  solicitado_por: User | null;
  aprobado_por: User | null;
}

/** Una fila de ingreso o egreso manual (con concepto del catálogo). */
export interface CajaLineaMovimiento {
  id: number;
  fecha: string;
  concepto: string | null;
  monto: string;
  descripcion: string | null;
  registrado_por: User | null;
  comprobante_url: string | null;
}

export interface CajaLineaCobro {
  id: number;
  fecha: string;
  cliente: Cliente | null;
  monto: string;
  credito_id: number | null;
  operacion: string;
  interes: string | null;
  mora: string | null;
  descuento: string | null;
  medio: MedioCobro;
  registrado_por: User | null;
}

export interface CajaLineaDesembolso {
  id: number;
  fecha: string;
  cliente: Cliente | null;
  monto: string;
  credito_id: number | null;
  concepto: string | null;
  registrado_por: User | null;
}

/** GET /reportes/cajas-apertura-cierre/{ciclo}/detalle — desglose línea por línea de un ciclo. */
export interface CajaCicloDetalle {
  billetajes: CajaLineaBilletaje[];
  total_billetaje: string;
  ingresos: CajaLineaMovimiento[];
  total_ingresos: string;
  egresos: CajaLineaMovimiento[];
  total_egresos: string;
  cobranzas: Record<MedioCobro, CajaLineaCobro[]>;
  totales_cobranza: Record<MedioCobro, string>;
  desembolsos: CajaLineaDesembolso[];
  total_desembolso: string;
  /** billetaje + ingresos + cobranzas (todos los medios) - egresos - desembolsos. */
  saldo_total: string;
  /** El arqueo contado al cerrar — null mientras el ciclo sigue abierto. */
  saldo_cierre: string | null;
  /** saldo_cierre - saldo_total. Negativo = faltante, positivo = sobrante. */
  diferencia: string | null;
}

export type MedioRecepcionBilletaje = 'efectivo' | 'yape' | 'plin' | 'transferencia';
export type MedioEgresoBilletaje = 'efectivo' | 'cuenta_bancaria';
export type CanalEgresoBilletaje = 'transferencia' | 'yape' | 'plin' | 'deposito';

export interface Billetaje {
  asesor_id: number;
  asesor?: User | null;
  id: number;
  caja_ciclo_id: number;
  boveda_id: number;
  empresa_id: number;
  monto: string;
  estado: BilletajeEstado;
  motivo?: string | null;
  medio_recepcion?: MedioRecepcionBilletaje | null;
  datos_recepcion?: string | null;
  cliente_id?: number | null;
  solicitado_por?: number | User | null;
  aprobado_por?: number | User | null;
  motivo_rechazo?: string | null;
  medio_egreso?: MedioEgresoBilletaje | null;
  canal_egreso?: CanalEgresoBilletaje | null;
  cuenta_bancaria_id?: number | null;
  fecha_resolucion?: string | null;
  created_at?: string;
  boveda?: Boveda;
  cuenta_bancaria?: CuentaBancaria | null;
  cliente?: Cliente | null;
  fotos?: MovimientoFoto[];
}

export type BienTipo = 'electro' | 'varios';
/**
 * Shared estado for every garantía model (bien / vehículo / inmueble).
 * `reservada` = una venta a crédito/apartado activa la tiene apartada;
 * `vendida` = la venta quedó pagada en su totalidad; `retirado_venta` = un
 * admin la quitó de la tienda sin borrar el registro (ver módulo Ventas /
 * TiendaProductosPage).
 */
export type GarantiaEstado =
  | 'en_garantia'
  | 'recuperado'
  | 'disponible_venta'
  | 'reservada'
  | 'vendida'
  | 'retirado_venta';
/** @deprecated alias for GarantiaEstado — kept while pages migrate. */
export type BienEstado = GarantiaEstado;
export type TipoCuota = 'diario' | 'semanal' | 'quincenal' | 'mensual';
export type MedioCobro = 'efectivo' | 'yape' | 'plin' | 'transferencia';
/** Discriminator for the shared crédito engine. */
export type TipoCredito = 'prendario' | 'vehicular' | 'hipotecario' | 'diario';
export type CreditoEstado =
  | 'pendiente'
  | 'aprobado'
  | 'rechazado'
  | 'activo'
  | 'refrendado'
  | 'cuota_pagada'
  | 'adendado'
  | 'refinanciado'
  | 'vencido'
  | 'pendiente_conformidad'
  | 'en_venta'
  | 'liquidado_pendiente'
  | 'liquidado'
  | 'vendido';
export type DocumentoCreditoTipo =
  | 'contrato'
  | 'declaracion'
  | 'adenda'
  | 'fotos'
  | 'devolucion'
  | 'voucher_desembolso'
  | 'voucher_pago'
  | 'sticker'
  | 'carta_no_adeudo'
  | 'recepcion_vehiculos'
  | 'ficha_socioeconomica'
  | 'notificacion_pago'
  | 'aviso_prejudicial'
  | 'saldo_deudor'
  | 'expediente'
  | 'contrato_transferencia'
  | 'pagare';

/** One photo of any garantía (bien / vehículo / inmueble), stored polymorphically. */
export interface GarantiaFoto {
  id: number;
  garantia_type: string;
  garantia_id: number;
  path: string;
  orden: number;
  url: string;
}
/** @deprecated alias for GarantiaFoto. */
export type BienFoto = GarantiaFoto;

export interface Bien {
  id: number;
  empresa_id: number;
  agencia_id: number;
  cliente_id: number;
  registrado_por?: number | User | null;
  /** Código único legible de la garantía (impreso en el sticker), p.ej. "B-000123". */
  codigo: string;
  tipo: BienTipo;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  observacion?: string | null;
  valorizacion: string;
  /** Sale price, set when the bien is sent to the tienda; shown in the storefront. */
  precio_venta?: string | null;
  /** Precio de oferta (menor al precio_venta), editable desde TiendaProductosPage. */
  precio_oferta?: string | null;
  puntaje: number;
  foto_cliente_producto_url?: string | null;
  video_url?: string | null;
  estado: GarantiaEstado;
  agencia?: Agencia;
  cliente?: Cliente;
  fotos?: GarantiaFoto[];
}

/** Garantía de un crédito vehicular — datos de la tarjeta de propiedad. */
export interface Vehiculo {
  id: number;
  empresa_id: number;
  agencia_id: number;
  cliente_id: number;
  registrado_por?: number | User | null;
  /** Código único legible de la garantía (impreso en el sticker), p.ej. "V-000123". */
  codigo: string;
  placa: string;
  motor: string;
  serie: string;
  color: string;
  marca: string;
  modelo?: string | null;
  anio?: number | null;
  clase?: string | null;
  propietario: string;
  tiene_soat: boolean;
  dejo_llave: boolean;
  dejo_tarjeta_propiedad: boolean;
  observacion?: string | null;
  valorizacion: string;
  precio_venta?: string | null;
  precio_oferta?: string | null;
  puntaje?: number | null;
  foto_cliente_producto_url?: string | null;
  video_url?: string | null;
  estado: GarantiaEstado;
  /** Backend accessor: `"{marca} {modelo} · {placa}"`. */
  nombre: string;
  agencia?: Agencia;
  cliente?: Cliente;
  fotos?: GarantiaFoto[];
}

/** Garantía de un crédito hipotecario — datos de la partida registral SUNARP. */
export interface Inmueble {
  id: number;
  empresa_id: number;
  agencia_id: number;
  cliente_id: number;
  registrado_por?: number | User | null;
  /** Código único legible de la garantía (impreso en el sticker), p.ej. "I-000123". */
  codigo: string;
  partida_registral: string;
  oficina_registral?: string | null;
  tipo_inmueble?: string | null;
  direccion: string;
  ubigeo_distrito_id?: number | null;
  /** Derivados de ubigeo_distrito en el backend — solo lectura. */
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  area_terreno?: string | null;
  area_construida?: string | null;
  propietario: string;
  con_gravamen: boolean;
  linderos?: string | null;
  observacion?: string | null;
  valorizacion: string;
  precio_venta?: string | null;
  precio_oferta?: string | null;
  puntaje?: number | null;
  foto_cliente_producto_url?: string | null;
  video_url?: string | null;
  estado: GarantiaEstado;
  /** Backend accessor: `"{tipo_inmueble} · {direccion}"`. */
  nombre: string;
  agencia?: Agencia;
  cliente?: Cliente;
  fotos?: GarantiaFoto[];
}

export interface DocumentoCredito {
  id: number;
  credito_id: number;
  empresa_id: number;
  tipo: DocumentoCreditoTipo;
  generado_por?: number | User | null;
  generado_at: string;
  impreso_at?: string | null;
  firmado_at?: string | null;
  /** API path that renders the PDF fresh on every request — fetch with an authenticated request, not a plain href. */
  ver_url: string;
  /** The asesor's uploaded scan/photo of the physically signed document — a plain public URL, unlike ver_url. */
  archivo_firmado_url?: string | null;
}

export interface CuotaCredito {
  id: number;
  credito_id: number;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_capital: string;
  monto_interes: string;
  monto_total: string;
  /** Solo créditos diarios: lo ya abonado de una cuota que aún no se cubrió completa (pago a cuenta / adelanto). */
  monto_abonado?: string;
  /** Solo créditos diarios (ver CreditoService::pagarCuotasDiario()) — null mientras la cuota sigue pendiente. */
  pagada_at?: string | null;
  mora_pagada?: string | null;
  cobro_id?: number | null;
}

export interface Credito {
  id: number;
  /** Código legible del crédito (ej. C-000123) — único por empresa. */
  codigo: string;
  empresa_id: number;
  agencia_id: number;
  /** prendario (default) | vehicular | hipotecario — all run on the same engine. */
  tipo_credito: TipoCredito;
  cliente_id: number;
  /** Aval (garante) — una persona registrada como cliente; solo lo usa el crédito hipotecario. */
  aval_id?: number | null;
  aval?: Cliente | null;
  /** Segundo aval (garante) — opcional, solo hipotecario. */
  aval_2_id?: number | null;
  aval2?: Cliente | null;
  registrado_por?: number | User | null;
  /** Informational supervisor (admin agencia / supervisor); only vehicular & hipotecario set it. */
  supervisado_por?: number | User | null;
  refrendo_de_credito_id?: number | null;
  numero_refrendo: number;
  adenda_de_credito_id?: number | null;
  refinanciamiento_de_credito_id?: number | null;
  /** Sucesor creado al pagar una cuota de un crédito de interés compuesto. */
  pago_cuota_de_credito_id?: number | null;
  monto_prestamo: string;
  interes: string;
  /** 'simple' (default, todos los tipos) | 'compuesto' (sistema francés, solo hipotecario). */
  tipo_interes: 'simple' | 'compuesto';
  /** El asesor pidió una tasa distinta a la configurada, al registrar el crédito. */
  interes_solicitud_especial?: boolean;
  /** Justificación de la tasa cuando difiere de la configurada por defecto. */
  motivo_interes?: string | null;
  tipo_cuota: TipoCuota;
  /**
   * Número de cuotas elegido por el asesor al registrar (solo cuando el tipo
   * permite más de 1, es decir vehicular / hipotecario). null ⇒ el crédito
   * usa el default por tipo_cuota al desembolsar.
   */
  numero_cuotas?: number | null;
  plazo_dias: number;
  estado: CreditoEstado;
  aprobado_por?: number | User | null;
  fecha_aprobacion?: string | null;
  motivo_rechazo?: string | null;
  fecha_desembolso?: string | null;
  fecha_vencimiento?: string | null;
  /** Conformidad notario/abogado (vehicular / hipotecario) — set once the PDF is uploaded on a pendiente_conformidad crédito. */
  conformidad_confirmada_at?: string | null;
  /** Only set when estado is vencido — see CreditoService::superaEsperaMora(). */
  puede_enviar_tienda?: boolean;
  /**
   * Set on the detail response (activo/vencido) — true si el crédito ya tiene
   * cobros registrados. Una vez desembolsado, la tasa de interés solo se puede
   * editar mientras siga en false (ver puedeEditarInteresCredito()).
   */
  tiene_cobros?: boolean;
  bienes?: Bien[];
  vehiculos?: Vehiculo[];
  inmuebles?: Inmueble[];
  cliente?: Cliente;
  documentos?: DocumentoCredito[];
  cuotas?: CuotaCredito[];
  /** Computed only when estado is activo/vencido — see CreditoService::calcularMontoLiquidacion(). */
  monto_liquidacion_sugerido?: {
    capital: string;
    interes: string;
    /** 0.00 unless estado is vencido — see CreditoService::calcularMora(). */
    mora: string;
    dias_mora: number;
    total: string;
    dias_transcurridos: number;
    dias_minimo: number;
    dias_cobrados: number;
    tasa_interes: string;
    /** Lo ya abonado parcialmente a cuotas pendientes (pago por cuotas) — ya descontado del total. */
    abonos_cuotas?: string;
  } | null;
  /** Computed only when estado is activo/vencido — ver CreditoService::admitePagoPorCuotas(): un diario con cuotas pendientes, o cualquier otro con más de una cuota por pagar. */
  permite_pago_cuotas?: boolean;
  /** Computed only when estado is activo/vencido — false para diario, compuesto o cualquier crédito que ya tenga cuotas pagadas (refrendar/adendar quedan bloqueados). */
  permite_refrendo?: boolean;
  /** Computed only when estado is activo/vencido y tipo_interes es simple — ver CreditoService::calcularMontoRefrendo(). Total = solo interés (el capital no se paga al refrendar). */
  monto_refrendo_sugerido?: {
    interes: string;
    /** Se cobra también al refrendar/adendar, no solo al liquidar. */
    mora: string;
    total: string;
    dias_transcurridos: number;
    dias_minimo: number;
    dias_cobrados: number;
    tasa_interes: string;
  } | null;
  /** Computed only when estado is activo/vencido y tipo_interes es compuesto — ver CreditoService::calcularMontoPagoCuota(). Equivalente de monto_refrendo_sugerido para pagar-cuota. */
  monto_pago_cuota_sugerido?: {
    numero_cuota: number;
    monto_capital: string;
    monto_interes: string;
    cuota_total: string;
    mora: string;
    total: string;
  } | null;
  /** Computed only when estado is activo/vencido y el crédito admite pago por cuotas (`permite_pago_cuotas`) — ver CreditoService::calcularMontoPagoCuotas() (numero_cuotas=1). */
  monto_pago_cuotas_sugerido?: MontoPagoCuotasSugerido | null;
  /** Solo en la respuesta de una operación de pago (refrendar, adendar, liquidar, pagar cuota(s), refinanciar): id del cobro creado, para abrir su voucher (GET /cobros/{id}/voucher). */
  cobro_id?: number;
}

export interface TiendaBienFoto {
  id: number;
  url: string;
  orden: number;
}

export interface TiendaBien {
  id: number;
  tipo: BienTipo;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  valorizacion: string;
  precio_venta: string | null;
  puntaje: number;
  foto_cliente_producto_url?: string | null;
  video_url?: string | null;
  fotos: TiendaBienFoto[];
  agencia: { id: number; nombre: string } | null;
  empresa: { id: number; nombre: string } | null;
}

export type ArticuloTipo = 'bien' | 'vehiculo' | 'inmueble';

/**
 * One row of the unified storefront (`/tienda/articulos`) — any garantía en
 * venta. `articulo_tipo` discriminates; the `bien` / `vehiculo` / `inmueble`
 * extra fields are only present for that tipo. No cliente/registral data.
 */
export interface TiendaArticulo {
  id: number;
  articulo_tipo: ArticuloTipo;
  /** Inofensivo en el storefront público (siempre disponible_venta); TiendaProductosPage lo usa para distinguir publicado/retirado/vendido. */
  estado: GarantiaEstado;
  /** bien: BienTipo; vehículo/inmueble: the literal 'vehiculo' / 'inmueble'. */
  tipo: string;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  valorizacion: string;
  precio_venta: string | null;
  precio_oferta?: string | null;
  puntaje: number | null;
  foto_cliente_producto_url?: string | null;
  video_url?: string | null;
  fotos: TiendaBienFoto[];
  agencia: { id: number; nombre: string } | null;
  empresa: { id: number; nombre: string } | null;
  // vehículo
  placa?: string;
  anio?: number | null;
  color?: string;
  clase?: string | null;
  tiene_soat?: boolean;
  // inmueble
  tipo_inmueble?: string | null;
  direccion?: string;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  area_terreno?: string | null;
  area_construida?: string | null;
}

export interface ConfiguracionCredito {
  id: number;
  empresa_id: number;
  agencia_id?: number | null;
  tipo_credito: TipoCredito;
  interes_default: string;
  plazo_dias: number;
  dias_espera_mora: number;
  dias_minimo_interes: number;
  tasa_mora_diaria: string;
  max_refrendos?: number | null;
  /** Tope de cuotas que un asesor puede elegir al registrar este tipo de crédito. */
  max_cuotas?: number;
  /** Solo hipotecario: TEA compensatoria máxima (tope BCRP), % anual efectivo, para la liquidación de saldo deudor. */
  tea_compensatoria_maxima?: string | null;
  /** Solo hipotecario: tasa moratoria legal, % anual efectivo. */
  tasa_moratoria_anual?: string | null;
  empresa?: Empresa;
  agencia?: Agencia | null;
}

export interface CronogramaCuota {
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_capital: string;
  monto_interes: string;
  monto_total: string;
}

/**
 * Simulación de crédito guardada: no crea un crédito real, solo deja un
 * registro del cronograma proyectado que se le mostró al cliente (mismo
 * motor de cálculo que Credito, ver CreditoService::previsualizarCronograma()).
 */
export interface SimulacionCredito {
  id: number;
  empresa_id: number;
  agencia_id: number;
  tipo_credito: TipoCredito;
  cliente_id: number;
  registrado_por?: number | User | null;
  monto_prestamo: string;
  interes: string;
  tipo_interes: 'simple' | 'compuesto';
  tipo_cuota: TipoCuota;
  numero_cuotas?: number | null;
  plazo_dias: number;
  fecha_base: string;
  monto_total_pagar: string;
  cronograma: CronogramaCuota[];
  created_at: string;
  cliente?: Cliente;
  agencia?: Agencia;
}

// ===== Módulo Ventas =====

/** Un artículo cualquiera de la tienda (bien / vehículo / inmueble). */
export type VentaArticulo = Bien | Vehiculo | Inmueble;

/** Solicitud pública "me interesa" de la tienda virtual — lado admin. */
export interface InteresArticulo {
  id: number;
  articulo_type: ArticuloTipo;
  articulo_id: number;
  empresa_id: number;
  agencia_id: number;
  nombre: string;
  telefono: string;
  email?: string | null;
  mensaje?: string | null;
  atendido_at: string | null;
  created_at: string;
  articulo?: VentaArticulo | null;
}

export type FormaVenta = 'contado' | 'credito' | 'apartado';
export type VentaEstado = 'activa' | 'pagada' | 'cancelada';
export type PagoVentaTipo = 'contado' | 'inicial' | 'cuota' | 'abono';
export type CuotaVentaEstado = 'pendiente' | 'pagada';
export type DocumentoVentaTipo =
  | 'voucher'
  | 'contrato_credito'
  | 'contrato_apartado'
  | 'compra_venta'
  | 'notarial';

export interface CuotaVenta {
  id: number;
  venta_id: number;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_capital: string;
  monto_interes: string;
  monto_total: string;
  monto_abonado: string;
  estado: CuotaVentaEstado;
}

export interface PagoVenta {
  id: number;
  venta_id: number;
  cuota_venta_id?: number | null;
  registrado_por?: number | User | null;
  tipo: PagoVentaTipo;
  monto: string;
  medio: MedioCobro;
  anulado_at?: string | null;
  created_at: string;
}

export interface DocumentoVenta {
  id: number;
  venta_id: number;
  tipo: DocumentoVentaTipo;
  generado_por?: number | User | null;
  generado_at: string;
}

export interface Venta {
  id: number;
  empresa_id: number;
  agencia_id: number;
  articulo_type: ArticuloTipo;
  articulo_id: number;
  credito_origen_id?: number | null;
  cliente_id: number;
  vendido_por: number | User;
  forma_venta: FormaVenta;
  estado: VentaEstado;
  precio_venta: string;
  inicial: string;
  /** Tasa mensual aplicada — solo forma_venta = credito. */
  interes?: string | null;
  numero_cuotas?: number | null;
  /** Solo forma_venta = credito. */
  tipo_cuota?: TipoCuota | null;
  /** Solo forma_venta = apartado. */
  fecha_limite?: string | null;
  saldo_pendiente: string;
  pagada_at?: string | null;
  cancelada_at?: string | null;
  created_at: string;
  cliente?: Cliente;
  articulo?: VentaArticulo;
  cuotas?: CuotaVenta[];
  pagos?: PagoVenta[];
  documentos?: DocumentoVenta[];
  /** Solo en index/show: alguna cuota pendiente con fecha_vencimiento pasada. */
  tiene_cuota_vencida?: boolean;
}

export interface ConfiguracionVenta {
  id: number;
  empresa_id: number;
  agencia_id?: number | null;
  interes_mensual_default: string;
  empresa?: Empresa;
  agencia?: Agencia | null;
}

/** Una fila de /reportes/flujo-caja: un asesor y su monto en una de las 5 categorías. */
export interface FlujoCajaPorAsesorItem {
  asesor_id: number;
  asesor_nombre: string;
  monto: number;
}

export interface FlujoCajaTotales {
  billetaje: number;
  ingresos: number;
  egresos: number;
  cobranza: number;
  desembolsos: number;
}

export interface ReporteFlujoCaja {
  saldo_caja: number;
  totales: FlujoCajaTotales;
  porAsesor: {
    billetaje: FlujoCajaPorAsesorItem[];
    ingresos: FlujoCajaPorAsesorItem[];
    egresos: FlujoCajaPorAsesorItem[];
    cobranza: FlujoCajaPorAsesorItem[];
    desembolsos: FlujoCajaPorAsesorItem[];
  };
}

/**
 * Una fila de /reportes/flujo-caja/anual: un mes con las 5 categorías
 * (formato ancho, listo para el `dataset` de LineChart — el index signature
 * es lo que pide MUI X Charts para DatasetElementType).
 */
export interface FlujoCajaPorMesItem {
  [key: string]: number;
  mes: number;
  billetaje: number;
  ingresos: number;
  egresos: number;
  cobranza: number;
  desembolsos: number;
}

export interface ReporteFlujoCajaAnual {
  porMes: FlujoCajaPorMesItem[];
}

/** Una fila de /reportes/flujo-caja/mensual: un día del mes con las 5 categorías (mismo formato ancho que FlujoCajaPorMesItem). */
export interface FlujoCajaPorDiaItem {
  [key: string]: number;
  dia: number;
  billetaje: number;
  ingresos: number;
  egresos: number;
  cobranza: number;
  desembolsos: number;
}

export interface ReporteFlujoCajaMensual {
  porDia: FlujoCajaPorDiaItem[];
}

/**
 * Una fila de /reportes/cumpleanos — un USUARIO del sistema (asesor,
 * supervisor, administrador…), no un cliente: se apoya en
 * users.fecha_nacimiento. Ver ReporteCumpleanosService en el backend.
 *
 * Ojo con el rango desde/hasta: acota el DÍA Y MES del cumpleaños dentro de un
 * año, no la fecha de nacimiento literal (los cumpleaños se repiten cada año).
 * Por eso `proximo_cumpleanos` puede caer en el año que viene aunque el rango
 * sea de este año, y por eso `cumple_anios` está anclado a ese próximo
 * cumpleaños y no al año en curso.
 */
export interface ReporteCumpleanosItem {
  id: number;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  /** Fecha literal de nacimiento (YYYY-MM-DD) — la que el usuario tiene cargada. */
  fecha_nacimiento: string;
  /** Edad que cumple en su próximo cumpleaños. */
  cumple_anios: number;
  /** Próxima fecha en que ese día/mes vuelve a caer (YYYY-MM-DD). */
  proximo_cumpleanos: string;
  /** Días que faltan desde hoy; 0 = hoy, 1 = mañana. Nunca negativo. */
  dias_para_cumple: number;
  /** Null cuando el usuario no está asignado a ninguna agencia. */
  agencia: string | null;
  roles: string[];
}

/**
 * Una fila de /reportes/atrasos-diarios — un crédito activo o vencido con los
 * DOS medidores de mora ya categorizados. Ver ReporteAtrasosService.
 *
 * Ojo: `atraso_venc_dias` y `dias_atraso` NO son el mismo número y no deben
 * leerse como si lo fueran. El primero son los días desde el vencimiento del
 * CRÉDITO COMPLETO; el segundo, desde la CUOTA vencida impaga más antigua (que
 * suele empezar a contar mucho antes). El semáforo va con cada uno por separado
 * porque las dos columnas se pintan distinto.
 *
 * Cuando no hay mora los tres campos de color/categoría vienen en null (sin
 * bolita) pero `atraso_venc_rank` sigue con un entero: el 5 de "al día", que
 * es lo que deja esa fila en su escalón y no la arrastra al principio.
 */
export interface AtrasosDiariosItem {
  credito_id: number;
  credito_codigo: string;
  tipo_credito: TipoCredito;
  /** El reporte solo entra créditos activos o vencidos. */
  estado: 'activo' | 'vencido';
  cliente: Cliente | null;
  asesor: User | null;
  fecha_desembolso: string | null;
  fecha_vencimiento: string | null;

  /** ===== Medidor 1: vencimiento del crédito completo ===== */
  atraso_venc_dias: number;
  atraso_venc_categoria: AtrasoVencimientoEtiqueta | null;
  atraso_venc_color: string | null;
  atraso_venc_rank: number;

  /** ===== Medidor 2: cuota vencida impaga más antigua ===== */
  dias_atraso: number;
  cuotas_atrasadas: number;
  /** Nivel del semáforo de cuotas. Sin etiqueta: la celda muestra el conteo. */
  atraso_cuota_nivel: AtrasoCuotaNivel | null;
  atraso_cuota_color: string | null;

  ultimo_abono: string | null;
  ultimo_abono_monto: string | null;
  tipo_cuota: TipoCuota;
  monto_prestamo: number;
  interes_prestamo: number;
  /** Suma del cronograma completo (todas las cuotas). */
  total: number;
  /** Lo que falta abonar: total menos lo abonado, nunca negativo. */
  saldo: number;
}

/** Etiquetas de AtrasoVencimiento (el reporte manda `etiqueta()`, no el valor del enum). */
export type AtrasoVencimientoEtiqueta =
  | 'Normal'
  | 'Problema potencial'
  | 'Deficiente'
  | 'Dudoso'
  | 'Pérdida'
  | 'Castigado';

/** Valores del enum AtrasoCuota — sin etiqueta, solo color. */
export type AtrasoCuotaNivel = 'reciente' | 'moderado' | 'serio' | 'critico' | 'severo';

/* ===== Planilla (sueldos del personal) ===== */

export type PlanillaEstado = 'borrador' | 'confirmada';

/**
 * Cabecera de una planilla. Todos los importes llegan como string decimal
 * ("1234.50") y los calcula el backend — el cliente solo los muestra.
 */
export interface PlanillaResumen {
  id: number;
  /** YYYY-MM */
  periodo: string;
  fecha_pago: string;
  agencia: string | null;
  estado: PlanillaEstado;
  total_ingresos: string;
  total_descuentos: string;
  total_tributos_trabajador: string;
  total_neto: string;
  total_aportes_empleador: string;
  cerrada_at: string | null;
}

export interface PlanillaTrabajador {
  user_id: number;
  tipo_documento: string;
  numero_documento: string;
  apellidos: string;
  nombres: string;
  situacion: string | null;
  ingresos: string;
  descuentos_devengado: string;
  /** Lo calcula el backend de los adelantos/préstamos pendientes — solo lectura. */
  descuentos_pagado: string;
  onp: string;
  afp: string;
  /** Ya no aplica: siempre "0.00". */
  essalud_trabajador: string;
  tributos_trabajador: string;
  essalud_empleador: string;
  /** Ya no aplica: siempre "0.00". */
  cts: string;
  aportes_empleador: string;
  neto: string;
  /** Inputs originales de la línea (para precargar la edición); `ingresos` = sueldo_base + bonificaciones. */
  sueldo_base: string;
  bonificaciones: string;
  /** Régimen tomado del usuario: AFP (11.37 %) u ONP (13 %) al trabajador. */
  es_afp: boolean;
  /** EsSalud (9 %) o SIS (S/ 15) al empleador. */
  es_sis: boolean;
  sis: string;
}

export interface PlanillaDetalle extends PlanillaResumen {
  trabajadores: PlanillaTrabajador[];
}

export type PlanillaDescuentoTipo = 'adelanto' | 'prestamo' | 'falta' | 'riesgo_caja' | 'otro';
export type PlanillaDescuentoEstado = 'pendiente' | 'saldado' | 'anulado';

export interface PlanillaDescuento {
  id: number;
  user_id: number;
  trabajador: string;
  tipo: PlanillaDescuentoTipo;
  tipo_label: string;
  concepto: string;
  monto: string;
  /** Monto mensual; null = se descuenta todo de una vez. */
  cuota: string | null;
  pagado: string;
  saldo: string;
  cuota_del_mes: string;
  fecha_registro: string;
  estado: PlanillaDescuentoEstado;
}

export interface ReportePlanilla {
  planilla_id: number;
  periodo: string;
  /** Formato PLAME: "08/2026". */
  periodo_plame: string;
  ruc: string;
  /** Razón social del empleador. */
  empleador: string;
  fecha_pago: string;
  agencia: string | null;
  estado: PlanillaEstado;
  cerrada_at: string | null;
  trabajadores: ReportePlanillaTrabajador[];
  totales: {
    ingresos_devengado: string;
    ingresos_pagado: string;
    descuentos: string;
    tributos_trabajador: string;
    neto: string;
    aportes_empleador: string;
  };
}

/** Listado de GET /reportes/planilla: la forma resumen de /planillas, sin `cerrada_at`. */
export type ReportePlanillaResumen = Omit<PlanillaResumen, 'cerrada_at'>;

/** Fila del reporte en formato PLAME R01 de SUNAT (`user_id` llega como string). */
export interface ReportePlanillaTrabajador {
  user_id: string;
  /** Código SUNAT: "01" = DNI. */
  tipo_documento: string;
  numero_documento: string;
  apellidos: string;
  nombres: string;
  /** p.ej. "ACTIVO O SUBSIDIADO". */
  situacion: string;
  ingresos_devengado: string;
  ingresos_pagado: string;
  descuentos: string;
  tributos_trabajador: string;
  neto: string;
  aportes_empleador: string;
}

/* ===== Reporte Ingresos y Egresos (estado de resultados) ===== */

export interface IngresosEgresosFila {
  /** Quien registró ("—" si falta); en ventas, el vendedor. */
  cuenta: string;
  /** "YYYY-MM-DD" o "—". */
  fecha: string;
  descripcion: string;
  /** String decimal; puede ser negativo (venta a pérdida). */
  monto: string;
  /** Solo en ingresos/egresos con boleta. */
  serie: string | null;
  numero: string | null;
}

export interface IngresosEgresosSeccion {
  filas: IngresosEgresosFila[];
  total: string;
}

export interface ReporteIngresosEgresos {
  ingresos: IngresosEgresosSeccion;
  cobranzas: IngresosEgresosSeccion;
  ventas: IngresosEgresosSeccion;
  egresos: IngresosEgresosSeccion;
  /** Neto a pagar de planillas confirmadas con fecha de pago en el rango; vacía (total "0.00") sin permiso de planillas. */
  planilla: IngresosEgresosSeccion;
  totales: {
    ingresos: string;
    cobranzas: string;
    ventas: string;
    egresos: string;
    planilla: string;
    total_ingresos: string;
    /** egresos + planilla. */
    total_egresos: string;
  };
  /** Total ingresos − total egresos; puede ser negativo. */
  utilidad_neta: string;
  /** utilidad / ingresos como ratio (0.8873 = 88.73 %); null sin ingresos. */
  margen_utilidad_bruta: number | null;
}

/* ===== Facturación electrónica SUNAT ===== */

/** 01 = factura, 03 = boleta, 07 = nota de crédito. */
export type TipoDocumentoSunat = '01' | '03' | '07';

export type EstadoComprobante =
  | 'borrador'
  | 'generado'
  | 'enviado'
  | 'aceptado'
  | 'observado'
  | 'rechazado'
  | 'error'
  | 'anulado'
  | 'sustituido';

export interface CreditoPendienteFacturar {
  id: number;
  codigo: string;
  cliente: string;
  documento: string;
  monto_prestamo: string;
  estado: string;
  fecha_vencimiento: string | null;
}

/** Respuesta de emitir / reenviar. */
export interface ComprobanteEmitido {
  id: number;
  numero: string;
  /** Denominación, p.ej. "FACTURA ELECTRÓNICA". */
  tipo: string;
  serie: string;
  correlativo: number;
  total: string;
  estado: EstadoComprobante;
}

export interface ConfiguracionFacturacion {
  modo: 'beta' | 'produccion';
  igv_porcentaje: string;
  moneda: 'PEN' | 'USD';
  interes_incluye_igv: boolean;
  serie_factura_defecto: string | null;
  serie_boleta_defecto: string | null;
  bloquear_si_supera_umbral: boolean;
  activo: boolean;
}

export interface SerieComprobante {
  serie: string;
  tipo_documento: TipoDocumentoSunat;
  agencia_id: number | null;
  descripcion: string | null;
  ultimo_correlativo: number;
  limite_numeracion: number | null;
  estado: boolean;
}

/** La clave SOL y la contraseña del certificado nunca vuelven: solo si existen. */
export interface CredencialesSunat {
  existe: boolean;
  /** Enmascarado, p.ej. "AL***TR". */
  usuario_sol: string | null;
  tiene_clave_sol: boolean;
  certificado_path: string | null;
  certificado_vence_en: string | null;
  certificado_cargado_at: string | null;
  ultima_validacion_at: string | null;
  ultima_validacion_ok: boolean | null;
  ultima_validacion_error: string | null;
  esta_completa: boolean;
  esta_vencida: boolean;
  dias_para_vencer: number | null;
}

export interface ComprobanteDetalle {
  id: number;
  orden: number;
  descripcion: string;
  unidad_medida: string;
  cantidad: string;
  valor_unitario: string;
  precio_unitario: string;
  valor_venta: string;
  igv: string;
  total: string;
}

/** Comprobante electrónico. En el listado vienen `cliente` y `serie_comprobante`, sin `detalles`. */
export interface Comprobante {
  id: number;
  agencia_id: number | null;
  tipo_documento: TipoDocumentoSunat;
  serie: string;
  correlativo: number;
  numero: string;
  fecha_emision: string;
  hora_emision: string | null;
  moneda: string;
  subtotal: string;
  igv: string;
  total: string;
  importe_letras: string | null;
  estado: EstadoComprobante;
  observaciones: string | null;
  receptor_tipo_documento: string;
  receptor_numero_documento: string;
  receptor_nombre: string;
  /** Respuesta de SUNAT (no hay un campo "mensaje" aparte). */
  cdr_codigo: string | null;
  cdr_descripcion: string | null;
  enviado_at: string | null;
  aceptado_at: string | null;
  anulado_at: string | null;
  motivo_anulacion: string | null;
  documento_origen_id: number | null;
  /** Boletas en resumen diario: su CDR aún no se puede consultar. */
  resumen_diario_ticket: string | null;
  detalles?: ComprobanteDetalle[];
}

/** Preview de GET /facturacion/creditos/{id}/previsualizar — no consume correlativo. */
export interface PreviewComprobanteCredito {
  credito: number;
  codigo: string;
  cliente: string;
  tipo: TipoDocumentoSunat;
  tipo_nombre: string;
  serie: string;
  correlativo_siguiente: number;
  base: string;
  igv: string;
  total: string;
  /** Cantidad de líneas, no el detalle. */
  lineas: number;
}
