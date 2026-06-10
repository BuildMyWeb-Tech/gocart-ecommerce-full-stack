// app/api/employee/create/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuth } from '@clerk/nextjs/server';
import authSeller from '@/middlewares/authSeller';
import { PERMISSIONS } from '@/middlewares/authEmployee';

// POST /api/employee/create — Store owner ONLY (employees cannot create employees)
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Only Clerk-authenticated store owners can create employees
    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Only store owners can create employees' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, permissions = {} } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check email not already used
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Sanitize permissions — only allow valid keys, force boolean values
    const validKeys = Object.values(PERMISSIONS);
    const sanitizedPermissions = {};
    for (const key of validKeys) {
      sanitizedPermissions[key] = permissions[key] === true;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        storeId,
        permissions: sanitizedPermissions,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        storeId: true,
      },
    });

    return NextResponse.json(
      { message: 'Employee created successfully', employee },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/employee/create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}