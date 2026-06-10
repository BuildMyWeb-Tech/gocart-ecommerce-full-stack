// middleware.ts
import { clerkMiddleware, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default clerkMiddleware((auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // ── Employee routes: bypass Clerk, handled by JWT ──────────────────────────
  if (
    pathname.startsWith('/employee') ||
    pathname.startsWith('/api/employee/') ||
    pathname.startsWith('/api/store/employee-auth')
  ) {
    return NextResponse.next();
  }

  const { userId } = auth();

  // ── Store panel: must be logged in ─────────────────────────────────────────
  if (pathname.startsWith('/store') || pathname.startsWith('/api/store/')) {
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // ── Admin panel: must be logged in ─────────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin/')) {
    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // ── Everything else: public (Clerk handles sign-in pages etc.) ─────────────
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};