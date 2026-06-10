// app/api/rating/route.js
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// POST /api/rating — Submit a review (verified buyers only)
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId, productId, rating, review } = await request.json();

    if (!orderId || !productId || !rating || !review) {
      return NextResponse.json(
        { error: 'orderId, productId, rating and review are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // ── Verified buyer check ──────────────────────────────────────
    // Must have a DELIVERED order that contains a variant of this product
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: 'DELIVERED',
        orderItems: {
          some: {
            variant: {
              productId,
            },
          },
        },
      },
    });

    if (!deliveredOrder) {
      return NextResponse.json(
        { error: 'You can only review products you have purchased and received' },
        { status: 403 }
      );
    }

    // ── Duplicate check ───────────────────────────────────────────
    const alreadyRated = await prisma.rating.findFirst({
      where: { userId, productId, orderId },
    });

    if (alreadyRated) {
      return NextResponse.json(
        { error: 'You have already reviewed this product for this order' },
        { status: 400 }
      );
    }

    // ── Create rating ─────────────────────────────────────────────
    const newRating = await prisma.rating.create({
      data: {
        userId,
        productId,
        orderId,
        rating: Number(rating),
        review: review.trim(),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(
      { message: 'Review submitted successfully', rating: newRating },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/rating error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/rating
// ?productId=xxx → public: all ratings for a product
// no params       → private: ratings by logged-in user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (productId) {
      const ratings = await prisma.rating.findMany({
        where: { productId },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Aggregate stats
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratings.forEach((r) => { distribution[r.rating]++; });

      return NextResponse.json({
        ratings,
        stats: {
          total: ratings.length,
          average: Math.round(avgRating * 10) / 10,
          distribution,
        },
      });
    }

    // Private: logged-in user's own ratings
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ratings = await prisma.rating.findMany({
      where: { userId },
      include: {
        product: {
          select: { id: true, name: true, images: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('GET /api/rating error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/rating?id=xxx — User deletes own review
export async function DELETE(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Rating ID required' }, { status: 400 });

    const existing = await prisma.rating.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    await prisma.rating.delete({ where: { id } });

    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/rating error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}