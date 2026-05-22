import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@rest/shared-types';

const UPSTREAM = process.env.API_URL ?? 'http://localhost:4000';
const ACCESS_COOKIE = 'rest_access';
const REFRESH_COOKIE = 'rest_refresh';

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const upstream = await fetch(`${UPSTREAM}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  if (!upstream.ok) {
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  }

  const { accessToken, refreshToken, expiresAt } = (await upstream.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };

  const res = NextResponse.json({ ok: true });
  // Only mark cookies Secure when the request actually arrived over HTTPS.
  // On plain-HTTP deployments (IP-only, no TLS) setting Secure causes the
  // browser to silently drop the cookie, breaking login entirely.
  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' ||
    req.nextUrl.protocol === 'https:';
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
  return res;
}
