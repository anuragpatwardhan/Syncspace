const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

class ApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (typeof body === 'object' && body && 'error' in body && (body as any).error) || res.statusText;
    throw new ApiError(res.status, body, msg as string);
  }
  return body as T;
}

export const api = {
  base: BASE,
  get: <T>(p: string, token?: string | null) => request<T>(p, { method: 'GET' }, token),
  post: <T>(p: string, data?: unknown, token?: string | null) =>
    request<T>(p, { method: 'POST', body: data ? JSON.stringify(data) : undefined }, token),
  del: <T>(p: string, token?: string | null) => request<T>(p, { method: 'DELETE' }, token),
};

export { ApiError };
