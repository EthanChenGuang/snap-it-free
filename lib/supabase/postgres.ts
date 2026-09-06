import { Pool, type PoolConfig } from 'pg';

const DEFAULT_PROJECT_REF = 'wnerhajyjjmrtsdmdpzu';
const DEFAULT_DB_HOST = 'aws-0-eu-west-3.pooler.supabase.com';

export function getListingsDbConfig(): PoolConfig {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  if (!password) {
    throw new Error('Missing SUPABASE_DB_PASSWORD');
  }

  const ref = process.env.SUPABASE_PROJECT_REF?.trim() || DEFAULT_PROJECT_REF;
  return {
    host: process.env.SUPABASE_DB_HOST?.trim() || DEFAULT_DB_HOST,
    port: 5432,
    user: process.env.SUPABASE_DB_USER?.trim() || `postgres.${ref}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    max: 4,
  };
}

let pool: Pool | null = null;

export function getListingsPool(): Pool {
  if (!pool) {
    pool = new Pool(getListingsDbConfig());
  }
  return pool;
}
