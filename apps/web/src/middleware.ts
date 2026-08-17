import { NextResponse, type NextRequest } from 'next/server';
import { decideRoute } from './lib/auth/roles';
// Edge-safe module only — importing ./session here would pull in next/headers.
import { SESSION_COOKIE, verifySessionToken } from './lib/auth/session-token';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const decision = decideRoute(pathname, payload?.role ?? null);

  if (decision.kind === 'allow') return NextResponse.next();

  if (decision.kind === 'forbidden') {
    return NextResponse.rewrite(new URL('/forbidden', request.url));
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${pathname}${search}`);
  const response = NextResponse.redirect(login);
  // A cookie that failed verification is dead weight; drop it so the browser
  // stops sending it on every subsequent request.
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)'],
};
