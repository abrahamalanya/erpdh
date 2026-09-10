import { apiFetch } from './client';
import type { ApiResponse } from '../types/api';
import type { ExpedienteRol, ExpedienteSeccion } from '../utils/expediente';

export interface ExpedienteDocumento {
  id: number;
  credito_id: number;
  rol: ExpedienteRol;
  seccion: ExpedienteSeccion;
  path: string;
  url: string | null;
  orden: number;
  created_at: string;
}

export function listExpediente(creditoId: number) {
  return apiFetch<ApiResponse<ExpedienteDocumento[]>>(
    `/creditos-prendarios/${creditoId}/expediente`
  );
}

export function uploadExpediente(
  creditoId: number,
  rol: ExpedienteRol,
  seccion: ExpedienteSeccion,
  archivos: File[]
) {
  const fd = new FormData();
  fd.append('rol', rol);
  fd.append('seccion', seccion);
  for (const f of archivos) fd.append('archivos[]', f);

  return apiFetch<ApiResponse<ExpedienteDocumento[]>>(
    `/creditos-prendarios/${creditoId}/expediente`,
    { method: 'POST', body: fd }
  );
}

export function deleteExpedienteDoc(creditoId: number, docId: number) {
  return apiFetch<ApiResponse<null>>(
    `/creditos-prendarios/${creditoId}/expediente/${docId}`,
    { method: 'DELETE' }
  );
}
