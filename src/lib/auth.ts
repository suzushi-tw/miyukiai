import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getRedisClient } from "./redis";

export const auth = betterAuth({
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
    },
    secondaryStorage: {
        get: async (key) => {
            const redis = await getRedisClient();
            const value = await redis.get(key);
            return value ? value : null;
        },
        set: async (key, value, ttl) => {
            const redis = await getRedisClient();
            if (ttl) {
                await redis.set(key, value, { EX: ttl });
            } else {
                await redis.set(key, value);
            }
        },
        delete: async (key) => {
            const redis = await getRedisClient();
            await redis.del(key);
        }
    }
});