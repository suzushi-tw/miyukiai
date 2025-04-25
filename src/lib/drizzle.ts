// filepath: c:\Users\huang\misoai\src\lib\drizzle.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from 'pg'; // Import the Pool class
import * as schema from './schema'; // Import your schema

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Create a Pool instance
const pool = new Pool({
  connectionString,
});

// Pass the pool and schema to drizzle, enable logging
export const db = drizzle(pool, { schema, logger: true });