import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const UPSTREAM = process.env.API_URL ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const refresh = jar.get('rest_refresh')?.value;
  if (refresh) {
    await fetch(`${UPSTREAM}/api/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => undefined);
  }
  // Use the request's own origin so redirects always go to the right host,
  // not a hardcoded NEXTAUTH_URL that may be wrong or missing.
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(new URL('/login', origin));
  res.cookies.delete('rest_access');
  res.cookies.delete('rest_refresh');
  return res;
}
