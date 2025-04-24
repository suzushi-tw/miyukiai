import { PrismaClient } from "@prisma/client";

// Use singleton pattern for PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = 
  globalForPrisma.prisma || 
  new PrismaClient();

// Prevent multiple instances during development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Force instantiation immediately
prisma.$connect();