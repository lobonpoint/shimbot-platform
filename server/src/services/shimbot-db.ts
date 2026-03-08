import pg from "pg";

// ShimBot Postgres — same machine as Paperclip (via apps-internal Docker network)
let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      host: process.env.SHIMBOT_DB_HOST || "localhost",
      port: parseInt(process.env.SHIMBOT_DB_PORT || "5432"),
      database: process.env.SHIMBOT_DB_NAME || "shimbot",
      user: process.env.SHIMBOT_DB_USER || "n8n",
      password: process.env.SHIMBOT_DB_PASSWORD,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function queryShimbot<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export function isShimbotDbConfigured(): boolean {
  return Boolean(process.env.SHIMBOT_DB_PASSWORD);
}
