/**
 * Minimal fetch wrapper. Reads access token from cookie (set by /api-proxy/auth/login
 * handler — see app/(auth)/login/actions.ts).
 */

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
  }
}

async function call<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api-proxy${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
    cache: 'no-store',
    ...init,
  });

  let data: unknown = undefined;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) data = await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { message?: string })?.message ?? `${method} ${path} failed`,
      data,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => call<T>('GET', p),
  post: <T>(p: string, body?: unknown) => call<T>('POST', p, body),
  patch: <T>(p: string, body?: unknown) => call<T>('PATCH', p, body),
  del: <T>(p: string) => call<T>('DELETE', p),
};
