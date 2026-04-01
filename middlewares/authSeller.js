// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\middlewares\authSeller.js
import prisma from '@/lib/prisma';

const authSeller = async (userId) => {
  try {
    if (!userId) return false;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });

    if (!user) return false;
    if (!user.store) return false;
    if (user.store.status === 'approved') return user.store.id;

    return false;
  } catch (error) {
    console.error('authSeller error:', error);
    return false;
  }
};

export default authSeller;
