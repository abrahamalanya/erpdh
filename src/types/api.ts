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

export interface RoleWithPermissions {
  id: number;
  name: string;
  guard_name: string;
  permissions: Permission[];
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
  telefono?: string | null;
  direccion?: string | null;
  referencia?: string | null;
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
/** Shared estado for every garantía model (bien / vehículo / inmueble). */
export type GarantiaEstado = 'en_garantia' | 'recuperado' | 'disponible_venta';
/** @deprecated alias for GarantiaEstado — kept while pages migrate. */
export type BienEstado = GarantiaEstado;
export type TipoCuota = 'diario' | 'semanal' | 'quincenal' | 'mensual';
export type MedioCobro = 'efectivo' | 'yape' | 'plin' | 'transferencia';
/** Discriminator for the shared crédito engine. */
export type TipoCredito = 'prendario' | 'vehicular' | 'hipotecario';
export type CreditoEstado =
  | 'pendiente'
  | 'aprobado'
  | 'rechazado'
  | 'activo'
  | 'refrendado'
  | 'adendado'
  | 'vencido'
  | 'pendiente_conformidad'
  | 'en_venta'
  | 'liquidado_pendiente'
  | 'liquidado';
export type DocumentoCreditoTipo = 'contrato' | 'declaracion' | 'adenda' | 'fotos' | 'devolucion';

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
  tipo: BienTipo;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  observacion?: string | null;
  valorizacion: string;
  /** Sale price, set when the bien is sent to the tienda; shown in the storefront. */
  precio_venta?: string | null;
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
  partida_registral: string;
  oficina_registral?: string | null;
  tipo_inmueble?: string | null;
  direccion: string;
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
}

export interface Credito {
  id: number;
  empresa_id: number;
  agencia_id: number;
  /** prendario (default) | vehicular | hipotecario — all run on the same engine. */
  tipo_credito: TipoCredito;
  cliente_id: number;
  registrado_por?: number | User | null;
  /** Informational supervisor (admin agencia / supervisor); only vehicular & hipotecario set it. */
  supervisado_por?: number | User | null;
  refrendo_de_credito_id?: number | null;
  numero_refrendo: number;
  adenda_de_credito_id?: number | null;
  monto_prestamo: string;
  interes: string;
  tipo_cuota: TipoCuota;
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
    total: string;
    dias_transcurridos: number;
    dias_minimo: number;
    dias_cobrados: number;
    tasa_interes: string;
  } | null;
  /** Computed only when estado is activo/vencido — see CreditoService::calcularMontoRefrendo(). Total = solo interés (el capital no se paga al refrendar). */
  monto_refrendo_sugerido?: {
    interes: string;
    total: string;
    dias_transcurridos: number;
    dias_minimo: number;
    dias_cobrados: number;
    tasa_interes: string;
  } | null;
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
  /** bien: BienTipo; vehículo/inmueble: the literal 'vehiculo' / 'inmueble'. */
  tipo: string;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  valorizacion: string;
  precio_venta: string | null;
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
  empresa?: Empresa;
  agencia?: Agencia | null;
}
