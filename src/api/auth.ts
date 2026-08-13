import { apiFetch } from './client';
import type { ApiResponse, LoginData, User } from '../types/api';

export function login(email: string, password: string) {
  return apiFetch<ApiResponse<LoginData>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return apiFetch<ApiResponse<null>>('/auth/logout', { method: 'POST' });
}

export function me() {
  return apiFetch<ApiResponse<User>>('/auth/me');
}
