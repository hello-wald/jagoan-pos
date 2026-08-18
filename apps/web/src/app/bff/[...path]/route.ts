import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

const METHODS_WITH_BODY = new Set(['POST', 'PATCH', 'PUT']);

/**
 * The single seam where credentials attach. The browser calls this
 * same-origin, the cookie rides along automatically, and the bearer token is
 * never readable from JavaScript.
 */
async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const target = `${process.env.GATEWAY_URL ?? 'http://localhost:3000'}/api/${path.join('/')}${request.nextUrl.search}`;

  const headers = new Headers({ accept: 'application/json' });
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (METHODS_WITH_BODY.has(request.method)) headers.set('content-type', 'application/json');

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: METHODS_WITH_BODY.has(request.method) ? await request.text() : undefined,
    cache: 'no-store',
  });

  const body = await upstream.text();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });

  // A 401 means the token is dead; drop the cookie so the next navigation
  // hits the edge gate and redirects to login rather than looping.
  if (upstream.status === 401) response.cookies.delete(SESSION_COOKIE);

  return response;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return proxy(request, (await ctx.params).path);
}
