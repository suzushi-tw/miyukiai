import { createBetterAuthAdapter } from "@fuma-comment/server/adapters/better-auth";
import { auth as betterAuth } from "@/lib/auth";
import { createPrismaAdapter } from "@fuma-comment/server/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const auth = createBetterAuthAdapter(betterAuth);
export const storage = createPrismaAdapter({
  db: prisma,
  auth: "better-auth" 
});