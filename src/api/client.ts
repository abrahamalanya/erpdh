const API_URL = import.meta.env.VITE_API_URL;

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
    throw new Error(json.message ?? 'Error de red');
  }

  return json as T;
}

/**
 * For binary responses (e.g. a PDF rendered on demand) — the endpoint
 * doesn't return JSON, so this can't go through apiFetch(). On failure it
 * still tries to read a JSON error body, since Laravel's error responses are.
 */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message ?? 'Error de red');
  }

  return response.blob();
}
