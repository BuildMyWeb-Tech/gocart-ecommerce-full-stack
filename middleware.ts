// middleware.ts
import { clerkMiddleware, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that employee JWT can access (no Clerk needed)
const EMPLOYEE_ROUTES = ['/api/employee/login'];

// Public routes — no auth needed at all
const PUBLIC_ROUTES = ['/api/employee/login', '/employee/login'];

export default clerkMiddleware((auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;

  // Always allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Employee-only API routes: just let them through,
  // each route handler verifies the JWT itself
  if (pathname.startsWith('/api/employee/')) {
    return NextResponse.next();
  }

  // Everything else uses Clerk (existing behaviour)
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
