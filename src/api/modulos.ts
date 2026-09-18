import { apiFetch } from './client';
import type { ApiResponse, Modulo } from '../types/api';

/** Full módulo catalog — sistemas only. */
export function listModulos() {
  return apiFetch<ApiResponse<Modulo[]>>('/modulos');
}
