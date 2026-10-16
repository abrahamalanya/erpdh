export interface PersonaReporte {
  id: number;
  nombre: string;
  apellido?: string | null;
}

export type EstadoCreditoReporte = 'al_dia' | 'atraso_leve' | 'atraso' | 'mora' | 'liquidado';

export interface MovimientoCierre {
  id: number;
  fecha?: string | null;
  hora: string | null;
  monto: string;
  concepto?: string | null;
  motivo?: string | null;
  medio?: string | null;
  observacion?: string | null;
  serie?: string | null;
  numero?: string | null;
  comprobante_url?: string | null;
  enviado_por?: PersonaReporte | null;
  cliente?: PersonaReporte | null;
  credito_id?: number | null;
  credito_codigo?: string | null;
}

export interface PagoCierre extends MovimientoCierre {
  operacion: string;
  interes: string | null;
  mora: string | null;
  descuento: string | null;
  estado_credito_al_cobrar: string | null;
  estado_credito: EstadoCreditoReporte | null;
  dias_atraso: number | null;
}

export interface ResumenCierre {
  saldo_apertura: string;
  total_billetaje: string;
  total_cobrado: string;
  total_ingresos: string;
  total_desembolsos: string;
  total_gastos: string;
  saldo_total: string;
  saldo_efectivo: string;
  monto_contado: string | null;
  diferencia: string | null;
  faltante: string;
  sobrante: string;
  neto: string;
}

export interface ReporteCierreCaja {
  cierre: {
    id: number;
    caja_id: number;
    fecha: string;
    estado: 'abierta' | 'cerrada';
    fecha_apertura: string | null;
    fecha_cierre: string | null;
    hora_apertura: string | null;
    hora_cierre: string | null;
    cierre_forzado: boolean;
    cierre_automatico: boolean;
    cerrada_por: PersonaReporte | null;
  };
  usuario: PersonaReporte | null;
  agencia: { id: number; nombre: string } | null;
  billetajes: MovimientoCierre[];
  pagos_por_medio: Record<string, PagoCierre[]>;
  totales_por_medio: Record<string, string>;
  ingresos: MovimientoCierre[];
  desembolsos: MovimientoCierre[];
  gastos: MovimientoCierre[];
  gastos_por_concepto: { concepto: string; cantidad: number; total: string; items: MovimientoCierre[] }[];
  resumen: ResumenCierre;
}
