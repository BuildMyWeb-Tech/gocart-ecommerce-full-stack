// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\middlewares\authAdmin.js
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Verifies the userId belongs to an admin email.
 * Supports comma-separated ADMIN_EMAIL env var.
 * Returns true | false.
 */
const authAdmin = async (userId) => {
  try {
    if (!userId) return false;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const adminEmails = process.env.ADMIN_EMAIL
      ? process.env.ADMIN_EMAIL.split(',').map((e) => e.trim().toLowerCase())
      : [];

    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    return adminEmails.includes(userEmail);
  } catch (error) {
    console.error('authAdmin error:', error);
    return false;
  }
};

export default authAdmin;