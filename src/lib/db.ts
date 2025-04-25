import { PrismaClient } from "@/generated/prisma";

// Use singleton pattern for PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Initialize client with proper error handling
let prisma: PrismaClient;

try {
  prisma = globalForPrisma.prisma || new PrismaClient();
} catch (error) {
  console.error("Failed to initialize Prisma client:", error);
  throw error;
}

// Prevent multiple instances during development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma };