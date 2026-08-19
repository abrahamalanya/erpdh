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
  foto_casa_url?: string | null;
  foto_negocio_url?: string | null;
  estado: Estado;
  agencia?: Agencia;
  asesor?: User | null;
}

export type CicloEstado = 'abierta' | 'cerrada';
export type BilletajeEstado = 'pendiente' | 'aprobado' | 'rechazado';
export type BovedaTipo = 'principal' | 'agencia';

export interface CajaCiclo {
  id: number;
  caja_id: number;
  empresa_id: number;
  fecha: string;
  estado: CicloEstado;
  saldo_apertura: string;
  saldo_calculado_cierre?: string | null;
  saldo_arqueo_cierre?: string | null;
  diferencia?: string | null;
  cerrada_por?: number | User | null;
  cierre_forzado: boolean;
  cierre_automatico?: boolean;
  abierta_at?: string | null;
  cerrada_at?: string | null;
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
}

export type BovedaMovimientoTipo = 'ingreso' | 'egreso';

export interface BovedaMovimiento {
  id: number;
  boveda_ciclo_id: number;
  empresa_id: number;
  tipo: BovedaMovimientoTipo;
  monto: string;
  concepto: string;
  registrado_por?: number | User | null;
  fecha_boveda: string;
}

export interface Billetaje {
  id: number;
  caja_ciclo_id: number;
  boveda_id: number;
  empresa_id: number;
  monto: string;
  estado: BilletajeEstado;
  solicitado_por?: number | User | null;
  aprobado_por?: number | User | null;
  motivo_rechazo?: string | null;
  fecha_resolucion?: string | null;
  created_at?: string;
  boveda?: Boveda;
}

export type BienTipo = 'electro' | 'varios';
export type BienEstado = 'en_garantia' | 'recuperado' | 'disponible_venta';
export type TipoCuota = 'diario' | 'semanal' | 'quincenal' | 'mensual';
export type CreditoEstado =
  | 'pendiente'
  | 'aprobado'
  | 'rechazado'
  | 'activo'
  | 'refrendado'
  | 'vencido'
  | 'en_venta'
  | 'liquidado';
export type DocumentoCreditoTipo = 'contrato' | 'declaracion' | 'adenda';

export interface BienFoto {
  id: number;
  bien_id: number;
  path: string;
  orden: number;
  url: string;
}

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
  puntaje: number;
  foto_cliente_producto_url?: string | null;
  video_url?: string | null;
  estado: BienEstado;
  agencia?: Agencia;
  cliente?: Cliente;
  fotos?: BienFoto[];
}

export interface DocumentoCreditoPrendario {
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

export interface CuotaCreditoPrendario {
  id: number;
  credito_id: number;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_capital: string;
  monto_interes: string;
  monto_total: string;
}

export interface CreditoPrendario {
  id: number;
  empresa_id: number;
  agencia_id: number;
  cliente_id: number;
  registrado_por?: number | User | null;
  refrendo_de_credito_id?: number | null;
  numero_refrendo: number;
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
  bienes?: Bien[];
  cliente?: Cliente;
  documentos?: DocumentoCreditoPrendario[];
  cuotas?: CuotaCreditoPrendario[];
  /** Computed only when estado is activo/vencido — see CreditoPrendarioService::calcularMontoLiquidacion(). */
  monto_liquidacion_sugerido?: {
    capital: string;
    interes: string;
    total: string;
    dias_transcurridos: number;
    dias_minimo: number;
    dias_cobrados: number;
    tasa_interes: string;
  } | null;
}

export interface ConfiguracionCreditoPrendario {
  id: number;
  empresa_id: number;
  agencia_id?: number | null;
  interes_default: string;
  plazo_dias: number;
  dias_espera_mora: number;
  dias_minimo_interes: number;
  tasa_mora_diaria: string;
  max_refrendos?: number | null;
  empresa?: Empresa;
  agencia?: Agencia | null;
}
