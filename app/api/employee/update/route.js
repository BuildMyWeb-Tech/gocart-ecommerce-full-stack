// app/api/employee/update/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuth } from '@clerk/nextjs/server';
import authSeller from '@/middlewares/authSeller';
import { PERMISSIONS } from '@/middlewares/authEmployee';

// PUT /api/employee/update — Store owner only
export async function PUT(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Only store owners can update employees' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, email, password, permissions, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Ensure employee belongs to this store
    const existing = await prisma.employee.findFirst({ where: { id, storeId } });
    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      // Check email not taken by another employee
      const emailTaken = await prisma.employee.findFirst({
        where: { email, id: { not: id } },
      });
      if (emailTaken) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      updateData.email = email;
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (permissions !== undefined) {
      // Sanitize — only valid permission keys, boolean values
      const validKeys = Object.values(PERMISSIONS);
      const sanitized = {};
      for (const key of validKeys) {
        sanitized[key] = permissions[key] === true;
      }
      updateData.permissions = sanitized;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ message: 'Employee updated successfully', employee: updated });
  } catch (error) {
    console.error('PUT /api/employee/update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}