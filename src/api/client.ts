const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json = await response.json();

  if (!response.ok) {
    if (response.status === 403 && typeof window !== 'undefined') window.dispatchEvent(new Event('umax:access-denied'));
    throw new ApiError([json.message, ...Object.values(json.errors ?? {}).flat()].filter(Boolean).join('\n') || 'Error de red', response.status);
  }

  return json as T;
}

/**
 * For binary responses (e.g. a PDF rendered on demand) — the endpoint
 * doesn't return JSON, so this can't go through apiFetch(). On failure it
 * still tries to read a JSON error body, since Laravel's error responses are.
 *
 * `options` exists for the few endpoints that generate a file from a POST body
 * (el fotocheck manda `usuario_ids`); sin él la petición es un GET pelado.
 */
export async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  // El Content-Type solo cuando hay cuerpo: mandarlo en un GET no cambia nada
  // pero ensucia la request y confunde al leer las llamadas.
  const hasBody = options.body !== undefined && options.body !== null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 403 && typeof window !== 'undefined') window.dispatchEvent(new Event('umax:access-denied'));
    const json = await response.json().catch(() => null);
    throw new ApiError(json?.message ?? 'Error de red', response.status);
  }

  return response.blob();
}
