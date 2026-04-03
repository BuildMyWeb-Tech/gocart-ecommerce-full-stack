// app/api/store/product/route.js
import imagekit from '@/configs/imageKit';
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ── POST: Store creates a product ─────────────────────────────────
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');
    const mrp = Number(formData.get('mrp'));
    const price = Number(formData.get('price'));
    const quantity = Number(formData.get('quantity'));
    const categoryRaw = formData.get('category');
    const keyFeaturesRaw = formData.get('keyFeatures');
    const lowStock = Number(formData.get('lowStock') || 10);
    const images = formData.getAll('images');

    if (!name || !description || !mrp || !price || !categoryRaw || images.length < 1) {
      return NextResponse.json({ error: 'Missing product details' }, { status: 400 });
    }

    let category = [];
    try {
      category = JSON.parse(categoryRaw);
      if (!Array.isArray(category) || category.length === 0) throw new Error();
    } catch {
      return NextResponse.json({ error: 'Invalid category format' }, { status: 400 });
    }

    let keyFeatures = [];
    if (keyFeaturesRaw) {
      try {
        keyFeatures = JSON.parse(keyFeaturesRaw);
        if (!Array.isArray(keyFeatures)) keyFeatures = [];
      } catch {
        keyFeatures = [];
      }
    }
    keyFeatures = keyFeatures.filter((f) => typeof f === 'string' && f.trim() !== '');

    const imagesUrl = await Promise.all(
      images.map(async (image) => {
        const buffer = Buffer.from(await image.arrayBuffer());
        const response = await imagekit.upload({
          file: buffer,
          fileName: image.name,
          folder: 'products',
        });
        return imagekit.url({
          path: response.filePath,
          transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '1024' }],
        });
      })
    );

    // ── Create product + auto-create inventory in one transaction ─
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          description,
          mrp,
          price,
          quantity: quantity || 0,
          category,
          keyFeatures,
          images: imagesUrl,
          inStock: (quantity || 0) > 0,
          storeId,
          createdBy: 'STORE',
        },
      });

      // Auto-create inventory record for this product+store
      await tx.inventory.create({
        data: {
          productId: created.id,
          storeId,
          quantity: quantity || 0,
          lowStock: lowStock || 10,
        },
      });

      return created;
    });

    return NextResponse.json({ message: 'Product added successfully', product });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}

// ── GET: Store fetches their own products with inventory ──────────
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const products = await prisma.product.findMany({
      where: { storeId },
      include: {
        rating: {
          select: { id: true, rating: true, review: true, userId: true, createdAt: true },
        },
        inventory: {
          where: { storeId },
          select: { id: true, quantity: true, lowStock: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}

// ── PUT: Store updates their own product ──────────────────────────
export async function PUT(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const existing = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const body = await request.json();
    const { name, description, mrp, price, quantity, category, existingImages, keyFeatures } = body;

    if (
      !name ||
      !description ||
      !mrp ||
      !price ||
      !Array.isArray(category) ||
      category.length === 0
    ) {
      return NextResponse.json({ error: 'Missing product details' }, { status: 400 });
    }

    const images =
      Array.isArray(existingImages) && existingImages.length > 0 ? existingImages : existing.images;

    const cleanKeyFeatures = Array.isArray(keyFeatures)
      ? keyFeatures.filter((f) => typeof f === 'string' && f.trim() !== '')
      : existing.keyFeatures || [];

    const newQty = Number(quantity) || 0;

    // ── Update product + sync inventory in one transaction ────────
    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: productId },
        data: {
          name,
          description,
          mrp: Number(mrp),
          price: Number(price),
          quantity: newQty,
          category,
          keyFeatures: cleanKeyFeatures,
          images,
          inStock: newQty > 0,
        },
      });

      // Upsert inventory — keep it in sync with product quantity
      await tx.inventory.upsert({
        where: { productId_storeId: { productId, storeId } },
        update: { quantity: newQty },
        create: { productId, storeId, quantity: newQty, lowStock: 10 },
      });

      return prod;
    });

    return NextResponse.json({ message: 'Product updated successfully', product: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}

// ── DELETE: Store deletes their own product ───────────────────────
export async function DELETE(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const existing = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Inventory deleted automatically via onDelete: Cascade on Product
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}
