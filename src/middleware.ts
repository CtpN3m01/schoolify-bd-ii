import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/_next',
  '/favicon.ico',
  '/api/mongoDB/auth/login/loginUsuario',
  '/api/mongoDB/auth/register/registrarUsuario',
  '/api/',
  '/public',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  try {
    // jose requiere una clave como Uint8Array
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/public).*)'],
};