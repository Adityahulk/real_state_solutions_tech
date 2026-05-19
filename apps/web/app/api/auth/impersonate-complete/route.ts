import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const UPSTREAM = process.env.API_URL ?? 'http://localhost:4000';
const ACCESS_COOKIE = 'rest_access';
const REFRESH_COOKIE = 'rest_refresh';
const ORIGINAL_ACCESS = 'rest_original_access';
const ORIGINAL_REFRESH = 'rest_original_refresh';

const bodySchema = z.object({
  targetUserId: z.string().uuid(),
});

/**
 * Two-step impersonation flow:
 *  1. Super admin clicks "Impersonate" → POST /api/auth/impersonate-complete
 *     with the target user id.
 *  2. Server proxies to upstream /auth/impersonate, gets a new token pair
 *     scoped to the target user, swaps the cookies, and stashes the original
 *     tokens under `rest_original_*` so we can restore them.
 */
export async function POST(req: NextRequest) {
  const jar = await cookies();
  const adminAccess = jar.get(ACCESS_COOKIE)?.value;
  const adminRefresh = jar.get(REFRESH_COOKIE)?.value;
  if (!adminAccess) {
    return NextResponse.json({ message: 'Not signed in' }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
  }

  const upstream = await fetch(`${UPSTREAM}/api/auth/impersonate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminAccess}`,
    },
    body: JSON.stringify({ targetUserId: parsed.data.targetUserId }),
  });
  if (!upstream.ok) {
    const body = await upstream.text();
    return new NextResponse(body, { status: upstream.status });
  }
  const { accessToken, refreshToken, expiresAt } = (await upstream.json()) as {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };

  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === 'production';

  // Stash original tokens so the admin can restore.
  if (adminAccess) {
    res.cookies.set(ORIGINAL_ACCESS, adminAccess, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });
  }
  if (adminRefresh) {
    res.cookies.set(ORIGINAL_REFRESH, adminRefresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  // Swap in the impersonation tokens.
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
  return res;
}
