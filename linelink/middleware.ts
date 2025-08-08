import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public paths that don't require authentication
const publicPaths = ['/signin', '/signup', '/forgot-password', '/reset-password', '/'];

// List of auth paths that should redirect to dashboard if already authenticated
const authPaths = ['/signin', '/signup', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('Middleware triggered for path:', pathname);
  
  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico')
  ) {
    console.log('Skipping middleware for path:', pathname);
    return NextResponse.next();
  }
  
  // Get the token from cookies
  const token = request.cookies.get('authToken')?.value;
  console.log('Auth token found:', !!token);

  // Check if the current path is an auth path
  const isAuthPath = authPaths.some(path => pathname === path);
  
  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (token && isAuthPath) {
    console.log('Redirecting authenticated user from auth page to /dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow access to public paths
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    console.log('Allowing access to public path:', pathname);
    return NextResponse.next();
  }

  // If not authenticated and not on a public path, redirect to signin
  if (!token) {
    console.log('No auth token found, redirecting to signin');
    const signInUrl = new URL('/signin', request.url);
    // Only set callbackUrl if it's not the root path
    if (pathname !== '/') {
      signInUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  console.log('Allowing access to protected path:', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
