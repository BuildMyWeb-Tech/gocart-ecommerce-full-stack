// app/api/products/route.js
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ── Resolve caller role ───────────────────────────────────────────────────────
async function resolveRole(request) {
  const { userId } = getAuth(request);
  if (!userId) return { role: 'PUBLIC', storeId: null };

  const isAdminUser = await authAdmin(userId);
  if (isAdminUser) return { role: 'ADMIN', storeId: null };

  const storeId = await authSeller(userId);
  if (storeId) return { role: 'STORE', storeId };

  return { role: 'PUBLIC', storeId: null };
}

// GET /api/products — Public product listing
// Public   → all ACTIVE products from all ACTIVE stores
// Admin    → all products from all stores (any status)
// Store    → all ACTIVE products from all ACTIVE stores (same as public for browsing)
// ?search=   → search by name or brand
// ?category= → filter by category ID
// ?storeId=  → filter by store
// ?page=     → pagination
// ?limit=    → page size (default 20, max 100)
export async function GET(request) {
  try {
    const { role, storeId } = await resolveRole(request);
    const { searchParams } = new URL(request.url);

    const search     = searchParams.get('search');
    const categoryId = searchParams.get('category');
    const filterStore = searchParams.get('storeId');
    const page       = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit      = Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const skip       = (page - 1) * limit;

    // Build where clause
    let where = {};

    if (role === 'ADMIN') {
      // Admin sees everything
      where = {};
    } else {
      // Public and Store owners browsing public catalog — only active products from active stores
      where = {
        status: 'ACTIVE',
        store: { status: 'ACTIVE', isActive: true },
      };
    }

    // Filters
    if (filterStore) where.storeId = filterStore;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categories = {
        some: { categoryId },
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          brand: true,
          images: true,
          status: true,
          createdAt: true,
          store: {
            select: { id: true, name: true, username: true, logo: true },
          },
          variants: {
            select: {
              id: true,
              color: true,
              size: true,
              price: true,
              stock: true,
              sku: true,
            },
          },
          categories: {
            include: {
              category: {
                select: { id: true, name: true, isGlobal: true },
              },
            },
          },
          ratings: {
            select: { rating: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Enrich with computed fields
    const enriched = products.map((p) => {
      const prices = p.variants.map((v) => v.price);
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      const avgRating =
        p.ratings.length > 0
          ? p.ratings.reduce((sum, r) => sum + r.rating, 0) / p.ratings.length
          : null;

      return {
        ...p,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        totalStock,
        inStock: totalStock > 0,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        ratingCount: p.ratings.length,
      };
    });

    return NextResponse.json({
      products: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}