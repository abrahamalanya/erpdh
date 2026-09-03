import { apiFetch } from './client';
import type { ApiResponse, ConfiguracionCredito, TipoCredito } from '../types/api';

export function listConfiguraciones() {
  return apiFetch<ApiResponse<ConfiguracionCredito[]>>('/configuraciones-credito-prendario');
}

export interface UpdateConfiguracionPayload {
  empresa_id?: number;
  agencia_id?: number;
  /** Defaults to 'prendario' on the backend when omitted. */
  tipo_credito?: TipoCredito;
  interes_default: string;
  plazo_dias: number;
  dias_espera_mora: number;
  dias_minimo_interes: number;
  tasa_mora_diaria: string;
  max_refrendos?: number;
}

export function updateConfiguracion(payload: UpdateConfiguracionPayload) {
  return apiFetch<ApiResponse<ConfiguracionCredito>>('/configuraciones-credito-prendario', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
