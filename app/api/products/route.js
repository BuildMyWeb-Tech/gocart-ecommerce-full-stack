import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ── GET: All active products for public users ─────────────────────────────────
// Query params:
//   ?category=Electronics  → filter by category (array field)
//   ?search=phone          → search by name or description
//   ?storeId=xxx           → filter by store
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const storeId = searchParams.get('storeId');

    const where = {
      inStock: true, // Only show active/in-stock products to users
    };

    if (category) {
      // category is a String[] field — filter products that contain this category
      where.category = { has: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (storeId) {
      where.storeId = storeId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        rating: {
          select: {
            id: true,
            rating: true,
            review: true,
            userId: true,
            createdAt: true,
          },
        },
        store: {
          select: {
            name: true,
            username: true,
            logo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // keyFeatures is already a String[] column — returned as-is from Prisma
    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
