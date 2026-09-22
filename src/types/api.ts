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

export interface RoleWithPermissions {
  id: number;
  name: string;
  guard_name: string;
  permissions: Permission[];
  modulos: Modulo[];
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

export interface User {
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
  roles?: Role[];
  /** Effective permission names via roles, returned by /auth/login and /auth/me only. */
  permission_names?: string[];
  empresa?: Empresa | null;
  agencia?: Agencia | null;
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
  telefono?: string | null;
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
  foto_casa_url?: string | null;
  foto_negocio_url?: string | null;
  estado: Estado;
  agencia?: Agencia;
  asesor?: User | null;
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
  /** Inofensivo en el storefront público (siempre disponible_venta); TiendaProductosPage lo usa para distinguir publicado/retirado. */
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
}

export interface ConfiguracionVenta {
  id: number;
  empresa_id: number;
  agencia_id?: number | null;
  interes_mensual_default: string;
  empresa?: Empresa;
  agencia?: Agencia | null;
}
