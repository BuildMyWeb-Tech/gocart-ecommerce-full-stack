// app/api/store/product/route.js
import imagekit from '@/configs/imageKit';
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ── POST: Store creates a product with variants ───────────────────
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');
    const mrp = Number(formData.get('mrp'));
    const categoryRaw = formData.get('category');
    const keyFeaturesRaw = formData.get('keyFeatures');
    const variantsRaw = formData.get('variants'); // ← NEW
    const images = formData.getAll('images');

    if (!name || !description || !mrp || !categoryRaw || images.length < 1) {
      return NextResponse.json({ error: 'Missing product details' }, { status: 400 });
    }

    // Parse category
    let category = [];
    try {
      category = JSON.parse(categoryRaw);
      if (!Array.isArray(category) || category.length === 0) throw new Error();
    } catch {
      return NextResponse.json({ error: 'Invalid category format' }, { status: 400 });
    }

    // Parse key features
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

    // Parse variants (required)
    let variantList = [];
    if (variantsRaw) {
      try {
        variantList = JSON.parse(variantsRaw);
        if (!Array.isArray(variantList)) throw new Error();
      } catch {
        return NextResponse.json({ error: 'Invalid variants format' }, { status: 400 });
      }
    }

    // Validate variants
    if (variantList.length === 0) {
      return NextResponse.json({ error: 'At least one size variant is required' }, { status: 400 });
    }
    for (const v of variantList) {
      if (!v.size || !v.barcode || !v.price || v.stock === undefined) {
        return NextResponse.json(
          { error: `Variant ${v.size || '?'} is missing size/barcode/price/stock` },
          { status: 400 }
        );
      }
    }

    // Check barcode uniqueness
    const barcodes = variantList.map((v) => v.barcode);
    const uniqueBarcodes = new Set(barcodes);
    if (uniqueBarcodes.size !== barcodes.length) {
      return NextResponse.json({ error: 'Duplicate barcodes in variants' }, { status: 400 });
    }
    const existingBarcode = await prisma.productVariant.findFirst({
      where: { barcode: { in: barcodes } },
    });
    if (existingBarcode) {
      return NextResponse.json(
        { error: `Barcode "${existingBarcode.barcode}" is already used by another product` },
        { status: 400 }
      );
    }

    // Upload images
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

    // Compute aggregate stock from variants
    const totalStock = variantList.reduce((sum, v) => sum + Number(v.stock), 0);

    // Create product + variants + inventory in one transaction
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          description,
          mrp,
          // price: use cheapest variant price as display price
          price: Math.min(...variantList.map((v) => Number(v.price))),
          quantity: totalStock,
          category,
          keyFeatures,
          images: imagesUrl,
          inStock: totalStock > 0,
          storeId,
          createdBy: 'STORE',
        },
      });

      // Create all variants
      await tx.productVariant.createMany({
        data: variantList.map((v) => ({
          productId: created.id,
          size: v.size,
          barcode: v.barcode,
          price: Number(v.price),
          stock: Number(v.stock),
        })),
      });

      // Auto-create inventory record
      await tx.inventory.create({
        data: { productId: created.id, storeId, quantity: totalStock, lowStock: 10 },
      });

      return created;
    });

    return NextResponse.json({ message: 'Product added successfully', product });
  } catch (error) {
    console.error('POST /api/store/product error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A barcode already exists. Please use unique barcodes.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}

// ── GET: Store fetches their products with variants ───────────────
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
        // ← Include variants (exclude barcode — not needed in list view)
        variants: {
          select: { id: true, size: true, price: true, stock: true, productId: true },
          orderBy: { size: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('GET /api/store/product error:', error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}

// ── PUT: Store updates product + variants ─────────────────────────
export async function PUT(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    if (!productId) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const existing = await prisma.product.findFirst({
      where: { id: productId, storeId },
      include: { variants: true },
    });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const body = await request.json();
    const {
      name,
      description,
      mrp,
      category,
      existingImages,
      keyFeatures,
      variants: variantList,
    } = body;

    if (!name || !description || !mrp || !Array.isArray(category) || category.length === 0) {
      return NextResponse.json({ error: 'Missing product details' }, { status: 400 });
    }

    // Validate variants if provided
    if (variantList && variantList.length === 0) {
      return NextResponse.json({ error: 'At least one variant is required' }, { status: 400 });
    }

    const images =
      Array.isArray(existingImages) && existingImages.length > 0 ? existingImages : existing.images;

    const cleanKeyFeatures = Array.isArray(keyFeatures)
      ? keyFeatures.filter((f) => typeof f === 'string' && f.trim() !== '')
      : existing.keyFeatures || [];

    // Compute total stock from new variants
    const totalStock = variantList
      ? variantList.reduce((sum, v) => sum + Number(v.stock), 0)
      : existing.quantity;

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: productId },
        data: {
          name,
          description,
          mrp: Number(mrp),
          price: variantList
            ? Math.min(...variantList.map((v) => Number(v.price)))
            : existing.price,
          quantity: totalStock,
          category,
          keyFeatures: cleanKeyFeatures,
          images,
          inStock: totalStock > 0,
        },
      });

      // Upsert variants if provided
      if (variantList && variantList.length > 0) {
        // Check barcode uniqueness (exclude variants of this product)
        const barcodes = variantList.map((v) => v.barcode);
        const existingBarcodeRecord = await tx.productVariant.findFirst({
          where: {
            barcode: { in: barcodes },
            productId: { not: productId },
          },
        });
        if (existingBarcodeRecord) {
          throw new Error(
            `Barcode "${existingBarcodeRecord.barcode}" is already used by another product`
          );
        }

        // Delete old variants not in the new list
        const newSizes = variantList.map((v) => v.size);
        await tx.productVariant.deleteMany({
          where: { productId, size: { notIn: newSizes } },
        });

        // Upsert each variant
        for (const v of variantList) {
          if (v.id) {
            // Existing variant — update
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                size: v.size,
                barcode: v.barcode,
                price: Number(v.price),
                stock: Number(v.stock),
              },
            });
          } else {
            // New variant — create
            await tx.productVariant.create({
              data: {
                productId,
                size: v.size,
                barcode: v.barcode,
                price: Number(v.price),
                stock: Number(v.stock),
              },
            });
          }
        }
      }

      // Sync inventory
      await tx.inventory.upsert({
        where: { productId_storeId: { productId, storeId } },
        update: { quantity: totalStock },
        create: { productId, storeId, quantity: totalStock, lowStock: 10 },
      });

      return prod;
    });

    return NextResponse.json({ message: 'Product updated successfully', product: updated });
  } catch (error) {
    console.error('PUT /api/store/product error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A barcode already exists. Please use unique barcodes.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || error.code }, { status: 400 });
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

    // Inventory + variants deleted automatically via onDelete: Cascade
    await prisma.product.delete({ where: { id: productId } });
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/store/product error:', error);
    return NextResponse.json({ error: error.code || error.message }, { status: 400 });
  }
}
