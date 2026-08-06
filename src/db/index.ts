import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString && connectionString.trim() !== "");
}

// Global pool instance to prevent connection leaks during Next.js hot-reloads
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const pool =
  globalForDb.conn ??
  (connectionString
    ? new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      })
    : undefined);

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.conn = pool;
}

export const db = pool ? drizzle(pool, { schema }) : null;
export { schema };
