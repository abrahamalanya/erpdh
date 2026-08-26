import { apiFetch } from './client';
import type { ApiResponse, ConfiguracionSistema } from '../types/api';

export interface ConfiguracionSistemaPayload {
  nombre_app?: string;
  favicon?: File | null;
}

export function getConfiguracion() {
  return apiFetch<ApiResponse<ConfiguracionSistema>>('/configuracion');
}

export function updateConfiguracion(payload: ConfiguracionSistemaPayload) {
  const formData = new FormData();
  formData.append('_method', 'PUT');

  if (payload.nombre_app) formData.append('nombre_app', payload.nombre_app);
  if (payload.favicon) formData.append('favicon', payload.favicon);

  return apiFetch<ApiResponse<ConfiguracionSistema>>('/configuracion', {
    method: 'POST',
    body: formData,
  });
}
