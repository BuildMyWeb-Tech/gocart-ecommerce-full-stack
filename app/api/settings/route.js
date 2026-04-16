// app/api/settings/route.js
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifyEmployeeToken, hasPermission } from '@/middlewares/authEmployee';

// ── Direct DB admin check (avoids internal fetch) ─────────────
async function isAdmin(userId) {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    // Check your actual admin logic — adjust field name if different
    const adminRecord = await prisma.admin?.findUnique?.({ where: { userId } });
    if (adminRecord) return true;
    // Fallback: check env-based admin list
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').map((s) => s.trim());
    return adminIds.includes(userId);
  } catch {
    return false;
  }
}

async function getStoreIdForUser(userId) {
  try {
    const store = await prisma.store.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (!store || store.status !== 'approved') return null;
    return store.id;
  } catch (error) {
    console.error('getStoreIdForUser error:', error);
    return null;
  }
}

// ── Resolve storeId from any auth source ──────────────────────
async function resolveStoreId(request) {
  // 1. Employee JWT (used by billing page & employee panel)
  try {
    const emp = verifyEmployeeToken(request);
    if (emp?.storeId) return { storeId: emp.storeId, source: 'employee', emp };
  } catch (_) {}

  // 2. Clerk (store owner via web session)
  try {
    const { userId } = getAuth(request);
    if (userId) {
      const storeId = await getStoreIdForUser(userId);
      if (storeId) return { storeId, source: 'owner', userId };
      // Check admin with storeId param
      return { storeId: null, source: 'clerk', userId };
    }
  } catch (_) {}

  return { storeId: null, source: 'none' };
}

export async function GET(request) {
  try {
    const { storeId: resolvedStoreId, source, userId, emp } = await resolveStoreId(request);

    const { searchParams } = new URL(request.url);
    const adminStoreId = searchParams.get('storeId');

    let storeId;

    if (adminStoreId) {
      // Admin fetching settings for a specific store
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const admin = await isAdmin(userId);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      storeId = adminStoreId;
    } else if (resolvedStoreId) {
      // Block employees from accessing settings page (but allow billing fetch)
      // Allow read for employees so billing page can get tax/currency settings
      storeId = resolvedStoreId;
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let settings = await prisma.storeSettings.findUnique({ where: { storeId } });

    if (!settings) {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

      settings = await prisma.storeSettings.create({
        data: {
          storeId: store.id,
          storeName: store.name,
          address: store.address || '',
          taxType: 'SINGLE',
          taxPercent: 18,
          cgst: 9,
          sgst: 9,
          currency: 'INR',
          showStoreName: true,
          showGST: true,
          footerMessage: 'Thank you for shopping with us!',
          defaultLowStock: 10,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { storeId: resolvedStoreId, source, userId, emp } = await resolveStoreId(request);

    // Employees cannot update settings (only owners can)
    if (source === 'employee') {
      // Allow STORE_OWNER role employees, block regular employees
      if (emp?.role !== 'STORE_OWNER') {
        return NextResponse.json(
          { error: 'Employees cannot update store settings' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { storeId: bodyStoreId, ...updateData } = body;

    let storeId;

    if (bodyStoreId) {
      // Admin updating settings for a specific store
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const admin = await isAdmin(userId);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      storeId = bodyStoreId;
    } else if (resolvedStoreId) {
      storeId = resolvedStoreId;
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Validate taxType
    if (updateData.taxType && !['SINGLE', 'GST_SPLIT'].includes(updateData.taxType)) {
      return NextResponse.json({ error: 'Invalid taxType.' }, { status: 400 });
    }

    // Validate numeric fields
    const numericChecks = [
      ['taxPercent', updateData.taxPercent],
      ['cgst', updateData.cgst],
      ['sgst', updateData.sgst],
      ['defaultLowStock', updateData.defaultLowStock],
    ];
    for (const [field, val] of numericChecks) {
      if (val !== undefined && (isNaN(val) || val < 0)) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
      }
    }

    const settings = await prisma.storeSettings.upsert({
      where: { storeId },
      update: updateData,
      create: {
        storeId,
        storeName: updateData.storeName || '',
        address: updateData.address || '',
        ...updateData,
      },
    });

    return NextResponse.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    console.error('POST /api/settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}