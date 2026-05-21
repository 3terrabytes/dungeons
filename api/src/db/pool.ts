import pg from "pg";
import { ENV } from "../env.js";

export const pool = new pg.Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: ENV.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
