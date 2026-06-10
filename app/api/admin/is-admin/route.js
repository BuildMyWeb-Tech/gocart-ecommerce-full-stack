// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\api\admin\is-admin\route.js
import authAdmin from '@/middlewares/authAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// GET /api/admin/is-admin — Verify admin status
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);

    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ isAdmin: true });
  } catch (error) {
    console.error('GET /api/admin/is-admin error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}