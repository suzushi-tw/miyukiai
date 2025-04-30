import { createClient } from "redis";

// Define connection options with environment variables
const redisOptions = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries: number) => {
      // Exponential backoff with max 3s delay
      return Math.min(retries * 100, 3000);
    },
    connectTimeout: 10000, // 10s timeout for connections
  }
};

// For Vercel serverless: use global object for persistence between invocations
declare global {
  // eslint-disable-next-line no-var
  var redis: ReturnType<typeof createClient> | undefined;
}

export async function getRedisClient() {
  // Use existing connection if available (from global scope)
  if (global.redis && global.redis.isOpen) {
    return global.redis;
  }
  
  // Close existing connection if it's not open
  if (global.redis && !global.redis.isOpen) {
    try {
      await global.redis.quit().catch(() => {});
      global.redis = undefined;
    } catch (err) {
      console.error("Error closing existing Redis connection:", err);
    }
  }
  
  // Create new connection
  const client = createClient(redisOptions);
  
  // Add error handling
  client.on("error", (err) => {
    console.error("Redis client error:", err);
  });
  
  try {
    await client.connect();
    
    // Save to global object for reuse across serverless function invocations
    global.redis = client;
    
    return client;
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    throw err;
  }
}

// Optional: helper function to gracefully close connection
export async function closeRedisConnection() {
  if (global.redis) {
    try {
      await global.redis.quit();
      global.redis = undefined;
    } catch (err) {
      console.error("Error closing Redis connection:", err);
    }
  }
}