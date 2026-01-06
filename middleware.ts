import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow these paths
  const allowedPaths = ['/', '/_next', '/api', '/favicon.ico', '/flip.png', '/croak.png', '/bro.mp3', '/helmet.png'];
  const allowedDirs = ['/sprites/', '/public/'];
  
  // Check if path is allowed
  const isAllowed = 
    allowedPaths.some(path => pathname === path || pathname.startsWith(path)) ||
    allowedDirs.some(dir => pathname.startsWith(dir));
  
  // If not allowed and not a static file, redirect to home
  if (!isAllowed && !pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|mp3|wav|json|txt|xml)$/)) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
