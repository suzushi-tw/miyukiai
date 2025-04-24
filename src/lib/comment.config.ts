// import { createBetterAuthAdapter } from "@fuma-comment/server/adapters/better-auth";
// import { auth as betterAuth } from "@/lib/auth";
// import { createPrismaAdapter } from "@fuma-comment/server/adapters/prisma";
// import { prisma } from "./db";

// export const auth = createBetterAuthAdapter(betterAuth);
// export const storage = createPrismaAdapter({
//   db: prisma,
//   auth: "better-auth" 
// });

import { createDrizzleAdapter } from "@fuma-comment/server/adapters/drizzle";
import { db } from "./drizzle";
import { comments, rates, roles, user } from "./schema";
import { createBetterAuthAdapter } from "@fuma-comment/server/adapters/better-auth";
import { auth as betterAuth } from "@/lib/auth";

export const auth = createBetterAuthAdapter(betterAuth);

export const storage = createDrizzleAdapter({
  db,
  auth: "better-auth",
  schemas: {
    comments,
    rates,
    roles,
    user,
  },
});