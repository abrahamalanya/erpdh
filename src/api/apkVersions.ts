import { apiFetch, apiFetchBlob } from './client';
import type { ApiResponse, ApkVersion, PaginatedData } from '../types/api';

export function listApkVersions(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<ApkVersion>>>(`/actualizaciones-apk?page=${page}`);
}

export interface CreateApkVersionPayload {
  apk: File;
  descripcion?: string;
}

/**
 * version/build_number/applicationId NO se envían: el backend los lee
 * directamente del AndroidManifest.xml real dentro del APK, nunca de un
 * valor tipeado a mano (eso era lo que permitía publicar una versión con
 * metadata distinta al contenido real del archivo).
 */
export function createApkVersion(payload: CreateApkVersionPayload) {
  const formData = new FormData();
  formData.append('apk', payload.apk);
  if (payload.descripcion) formData.append('descripcion', payload.descripcion);

  return apiFetch<ApiResponse<ApkVersion>>('/actualizaciones-apk', { method: 'POST', body: formData });
}

export function publicarApkVersion(id: number) {
  return apiFetch<ApiResponse<ApkVersion>>(`/actualizaciones-apk/${id}/publicar`, { method: 'POST' });
}

export function deleteApkVersion(id: number) {
  return apiFetch<ApiResponse<null>>(`/actualizaciones-apk/${id}`, { method: 'DELETE' });
}

export function getApkVersionBlob(id: number) {
  return apiFetchBlob(`/actualizaciones-apk/${id}/descargar`);
}
