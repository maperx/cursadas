import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Define it in your environment (or .env) before running the app/seed."
  );
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
