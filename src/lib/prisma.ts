import { PrismaClient } from '../generated/prisma';

// Prevent multiple instances of Prisma Client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use existing client instance if available in development to avoid too many connections
export const db = global.prisma || new PrismaClient();

// Prevent multiple instances during hot-reloading in development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}