import { apiFetch } from './client';
import type { ApiResponse, TipoDocumento } from '../types/api';

export interface ClienteMapa {
  id: number;
  nombre: string;
  apellido: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  direccion: string | null;
  referencia: string | null;
  latitud: number;
  longitud: number;
  tiene_credito_activo: boolean;
  fecha_vencimiento_credito: string | null;
}

export function getMapaClientes() {
  return apiFetch<ApiResponse<ClienteMapa[]>>('/dashboard/mapa-clientes');
}
