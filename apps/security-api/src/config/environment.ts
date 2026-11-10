export interface SecurityApiEnvironment {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  port: number;
}

const DEFAULT_PORT = 3001;

export function validateEnvironment(env: NodeJS.ProcessEnv): SecurityApiEnvironment {
  const databaseUrl = env.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL is required');
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol) ||
      !parsedDatabaseUrl.hostname ||
      parsedDatabaseUrl.pathname.length <= 1) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  if (parsedDatabaseUrl.searchParams.get('schema') !== 'nova_core') {
    throw new Error('DATABASE_URL must target the nova_core schema');
  }

  const supabaseUrl = env.SUPABASE_URL;
  if (typeof supabaseUrl !== 'string' || supabaseUrl.trim().length === 0) {
    throw new Error('SUPABASE_URL is required');
  }
  let parsedSupabaseUrl: URL;
  try {
    parsedSupabaseUrl = new URL(supabaseUrl);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL');
  }
  if (!['https:', 'http:'].includes(parsedSupabaseUrl.protocol) || !parsedSupabaseUrl.hostname) {
    throw new Error('SUPABASE_URL must be a valid HTTP(S) URL');
  }

  const supabaseAnonKey = env.SUPABASE_ANON_KEY;
  if (typeof supabaseAnonKey !== 'string' || supabaseAnonKey.trim().length === 0) {
    throw new Error('SUPABASE_ANON_KEY is required');
  }

  const rawPort = env.PORT ?? String(DEFAULT_PORT);
  if (!/^[0-9]+$/.test(rawPort)) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return { databaseUrl, supabaseUrl, supabaseAnonKey, port };
}
