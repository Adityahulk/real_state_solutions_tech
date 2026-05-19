import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const UPSTREAM = process.env.API_URL ?? 'http://localhost:4000';
const ACCESS_COOKIE = 'rest_access';

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const url = new URL(`${UPSTREAM}/api/${path}`);
  url.search = req.nextUrl.search;

  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  const headers = new Headers(req.headers);
  headers.delete('host');
  if (access) headers.set('authorization', `Bearer ${access}`);

  const init: RequestInit = {
    method: req.method,
    headers,
    body:
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await req.text(),
    redirect: 'manual',
  };

  const upstream = await fetch(url, init);
  const respBody = await upstream.text();
  const res = new NextResponse(respBody, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await ctx.params);
}
