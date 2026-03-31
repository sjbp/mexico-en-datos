import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL environment variable is not set. Please configure your database connection.'
      );
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export async function query<T = Record<string, unknown>>(
  sqlStr: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = getSql();
  const rows = await sql.query(sqlStr, params);
  return rows as T[];
}
