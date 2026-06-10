// app/api/admin/categories/route.js
import imagekit from '@/configs/imageKit';
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// GET /api/admin/categories — Admin: all global categories
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const categories = await prisma.category.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('GET /api/admin/categories error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/categories — Admin creates a global category
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const name        = formData.get('name')?.trim();
    const description = formData.get('description')?.trim();
    const imageFile   = formData.get('image');

    if (!name || !description || !imageFile) {
      return NextResponse.json({ error: 'Name, description and image are required' }, { status: 400 });
    }

    // Global categories must be unique by name (storeId is null)
    const existing = await prisma.category.findFirst({
      where: { name, isGlobal: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'A global category with this name already exists' }, { status: 400 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: imageFile.name,
      folder: 'categories/global',
    });
    const imageUrl = imagekit.url({
      path: uploadResponse.filePath,
      transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '512' }],
    });

    const category = await prisma.category.create({
      data: {
        name,
        description,
        image: imageUrl,
        isGlobal: true,
        storeId: null,
      },
    });

    return NextResponse.json({ message: 'Global category created successfully', category });
  } catch (error) {
    console.error('POST /api/admin/categories error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/categories — Admin edits a global category
export async function PUT(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const id          = formData.get('id');
    const name        = formData.get('name')?.trim();
    const description = formData.get('description')?.trim();
    const imageFile   = formData.get('image');

    if (!id || !name || !description) {
      return NextResponse.json({ error: 'ID, name and description are required' }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || !existing.isGlobal) {
      return NextResponse.json({ error: 'Global category not found' }, { status: 404 });
    }

    // Check name conflict with other global categories
    const nameConflict = await prisma.category.findFirst({
      where: { name, isGlobal: true, NOT: { id } },
    });
    if (nameConflict) {
      return NextResponse.json({ error: 'Another global category with this name exists' }, { status: 400 });
    }

    let imageUrl = existing.image;
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const uploadResponse = await imagekit.upload({
        file: buffer,
        fileName: imageFile.name,
        folder: 'categories/global',
      });
      imageUrl = imagekit.url({
        path: uploadResponse.filePath,
        transformation: [{ quality: 'auto' }, { format: 'webp' }, { width: '512' }],
      });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name, description, image: imageUrl },
    });

    return NextResponse.json({ message: 'Category updated successfully', category: updated });
  } catch (error) {
    console.error('PUT /api/admin/categories error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/categories — Admin deletes a global category
export async function DELETE(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!existing || !existing.isGlobal) {
      return NextResponse.json({ error: 'Global category not found' }, { status: 404 });
    }

    // Remove from ProductCategory join table first, then delete category
    await prisma.$transaction(async (tx) => {
      await tx.productCategory.deleteMany({ where: { categoryId: id } });
      await tx.category.delete({ where: { id } });
    });

    return NextResponse.json({
      message: 'Category deleted successfully',
      affectedProducts: existing._count.products,
    });
  } catch (error) {
    console.error('DELETE /api/admin/categories error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}