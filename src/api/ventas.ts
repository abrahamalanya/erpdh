import { apiFetch, apiFetchBlob } from './client';
import type {
  ApiResponse,
  ArticuloTipo,
  DocumentoVenta,
  FormaVenta,
  MedioCobro,
  PaginatedData,
  TiendaArticulo,
  Venta,
  VentaEstado,
} from '../types/api';

// ===== Catálogo interno (autenticado) — mismo servicio que la tienda pública =====

export interface ListCatalogoVentaFilters {
  tipo?: ArticuloTipo;
}

export function listCatalogoVenta(page = 1, filters: ListCatalogoVentaFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.tipo) params.set('tipo', filters.tipo);

  return apiFetch<ApiResponse<PaginatedData<TiendaArticulo>>>(`/ventas/catalogo?${params.toString()}`);
}

// ===== Ventas =====

export interface ListVentasFilters {
  estado?: VentaEstado;
  formaVenta?: FormaVenta;
  clienteId?: number;
}

export function listVentas(page = 1, filters: ListVentasFilters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.formaVenta) params.set('forma_venta', filters.formaVenta);
  if (filters.clienteId) params.set('cliente_id', String(filters.clienteId));

  return apiFetch<ApiResponse<PaginatedData<Venta>>>(`/ventas?${params.toString()}`);
}

export function getVenta(id: number) {
  return apiFetch<ApiResponse<Venta>>(`/ventas/${id}`);
}

export interface CreateVentaPayload {
  tipo: ArticuloTipo;
  articulo_id: number;
  cliente_id: number;
  forma_venta: FormaVenta;
  medio: MedioCobro;
  /** Requerido para credito/apartado. */
  inicial?: string;
  /** Requerido para credito. */
  numero_cuotas?: number;
  /** Opcional; si se omite el backend usa la tasa configurada (0 = sin interés). */
  interes?: string;
  /** Requerido para apartado (YYYY-MM-DD). */
  fecha_limite?: string;
}

export function createVenta(payload: CreateVentaPayload) {
  return apiFetch<ApiResponse<Venta>>('/ventas', { method: 'POST', body: JSON.stringify(payload) });
}

export function pagarCuotaVenta(ventaId: number, cuotaId: number, monto: string, medio: MedioCobro) {
  return apiFetch<ApiResponse<Venta>>(`/ventas/${ventaId}/cuotas/${cuotaId}/pagar`, {
    method: 'POST',
    body: JSON.stringify({ monto, medio }),
  });
}

export function abonarVenta(ventaId: number, monto: string, medio: MedioCobro) {
  return apiFetch<ApiResponse<Venta>>(`/ventas/${ventaId}/abonar`, {
    method: 'POST',
    body: JSON.stringify({ monto, medio }),
  });
}

export function cancelarVenta(ventaId: number) {
  return apiFetch<ApiResponse<Venta>>(`/ventas/${ventaId}/cancelar`, { method: 'POST' });
}

export function getVentaDocumentoBlob(ventaId: number, documentoId: number) {
  return apiFetchBlob(`/ventas/${ventaId}/documentos/${documentoId}`);
}

export const DOCUMENTO_VENTA_TIPO_LABELS: Record<DocumentoVenta['tipo'], string> = {
  voucher: 'Voucher de pago',
  contrato_credito: 'Contrato de venta a crédito',
  contrato_apartado: 'Contrato de apartado',
  compra_venta: 'Contrato de compra y venta',
  notarial: 'Documento notarial',
};
