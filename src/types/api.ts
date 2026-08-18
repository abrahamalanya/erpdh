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
  registrado_por?: number | User | null;
  tipo: BienTipo;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  observacion?: string | null;
  valorizacion: string;
  cantidad: number;
  foto_cliente_producto_url?: string | null;
  estado: BienEstado;
  agencia?: Agencia;
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
  pdf_url: string;
}

export interface CreditoPrendario {
  id: number;
  empresa_id: number;
  agencia_id: number;
  bien_id: number;
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
  bien?: Bien;
  cliente?: Cliente;
  documentos?: DocumentoCreditoPrendario[];
}

export interface ConfiguracionCreditoPrendario {
  id: number;
  empresa_id: number;
  agencia_id?: number | null;
  tipo: BienTipo;
  interes_default: string;
  plazo_dias: number;
  dias_espera_mora: number;
  tasa_mora_diaria: string;
  max_refrendos?: number | null;
  empresa?: Empresa;
  agencia?: Agencia | null;
}
