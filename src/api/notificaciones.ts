import { apiFetch } from './client';
import type { ApiResponse, Notificacion, PaginatedData } from '../types/api';

export interface NotificacionesResponse {
  notificaciones: PaginatedData<Notificacion>;
  no_leidas: number;
}

export function listNotificaciones(page = 1) {
  return apiFetch<ApiResponse<NotificacionesResponse>>(`/notificaciones?page=${page}`);
}

export function marcarLeidoNotificacion(id: string) {
  return apiFetch<ApiResponse<Notificacion>>(`/notificaciones/${id}/marcar-leido`, {
    method: 'POST',
  });
}

export function marcarTodasLeidasNotificaciones() {
  return apiFetch<ApiResponse<null>>('/notificaciones/marcar-todas-leidas', {
    method: 'POST',
  });
}
