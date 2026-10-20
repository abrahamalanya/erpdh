import { apiFetch, apiFetchBlob } from './client';
import type { ApiResponse, ApkVersion, PaginatedData } from '../types/api';

export function listApkVersions(page = 1) {
  return apiFetch<ApiResponse<PaginatedData<ApkVersion>>>(`/actualizaciones-apk?page=${page}`);
}

export interface CreateApkVersionPayload {
  apk: File;
  version: string;
  build_number: number;
  application_id: string;
  descripcion?: string;
}

export function createApkVersion(payload: CreateApkVersionPayload) {
  const formData = new FormData();
  formData.append('apk', payload.apk);
  formData.append('version', payload.version);
  formData.append('build_number', String(payload.build_number));
  formData.append('application_id', payload.application_id);
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
