import { apiFetch, apiFetchBlob } from './client';
import type { ApiResponse, PaginatedData } from '../types/api';

export interface QrGenerado {
  id: number;
  url: string;
  user_id: number | null;
  generado_por: string;
  created_at: string;
  imagen_png: string;
}

export const listQr = (page = 1) => apiFetch<ApiResponse<PaginatedData<QrGenerado>>>(`/qr?page=${page}`);
export const generarQr = (url: string) => apiFetch<ApiResponse<QrGenerado>>('/qr', { method: 'POST', body: JSON.stringify({ url }) });
export const descargarQr = (id: number): Promise<Blob> => apiFetchBlob(`/qr/${id}/png`);
export const eliminarQr = (id: number) => apiFetch<ApiResponse<null>>(`/qr/${id}`, { method: 'DELETE' });
