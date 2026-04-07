// app/api/settings/route.js
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

async function isAdmin(userId) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/is-admin`, {
      headers: { 'x-user-id': userId },
    });
    const data = await res.json();
    return data?.isAdmin === true;
  } catch {
    return false;
  }
}

// Directly resolve storeId from userId — no status gate for settings
async function getStoreIdForUser(userId) {
  try {
    const store = await prisma.store.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (!store) return null;
    return store.id; // allow any status — owner can always edit their own settings
  } catch (error) {
    console.error('getStoreIdForUser error:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const adminStoreId = searchParams.get('storeId');

    let storeId;

    if (adminStoreId) {
      const admin = await isAdmin(userId);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      storeId = adminStoreId;
    } else {
      storeId = await getStoreIdForUser(userId);
      if (!storeId) {
        return NextResponse.json({ error: 'No store found for this user.' }, { status: 403 });
      }
    }

    let settings = await prisma.storeSettings.findUnique({ where: { storeId } });

    if (!settings) {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

      settings = await prisma.storeSettings.create({
        data: {
          storeId: store.id,
          storeName: store.name,
          address: store.address,
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
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { storeId: bodyStoreId, ...updateData } = body;

    let storeId;

    if (bodyStoreId) {
      const admin = await isAdmin(userId);
      if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      storeId = bodyStoreId;
    } else {
      storeId = await getStoreIdForUser(userId);
      if (!storeId) {
        return NextResponse.json({ error: 'No store found for this user.' }, { status: 403 });
      }
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
