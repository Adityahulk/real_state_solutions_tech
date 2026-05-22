import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ACCESS = 'rest_access';
const REFRESH = 'rest_refresh';
const ORIGINAL_ACCESS = 'rest_original_access';
const ORIGINAL_REFRESH = 'rest_original_refresh';

/**
 * Restore the admin's original tokens stashed by /impersonate-complete.
 * If the original cookies are gone (TTL expired), we send the user to /login.
 */
export async function POST(req: NextRequest) {
  const jar = await cookies();
  const origA = jar.get(ORIGINAL_ACCESS)?.value;
  const origR = jar.get(ORIGINAL_REFRESH)?.value;

  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' ||
    req.nextUrl.protocol === 'https:';
  if (!origA || !origR) {
    const r = NextResponse.redirect(
      new URL('/login', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
    );
    r.cookies.delete(ACCESS);
    r.cookies.delete(REFRESH);
    r.cookies.delete(ORIGINAL_ACCESS);
    r.cookies.delete(ORIGINAL_REFRESH);
    return r;
  }
  const res = NextResponse.redirect(
    new URL('/', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  );
  res.cookies.set(ACCESS, origA, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  res.cookies.set(REFRESH, origR, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.delete(ORIGINAL_ACCESS);
  res.cookies.delete(ORIGINAL_REFRESH);
  return res;
}
