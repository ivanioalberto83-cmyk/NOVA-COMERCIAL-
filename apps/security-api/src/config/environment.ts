export interface SecurityApiEnvironment {
  databaseUrl: string;
  jwtSecret: string;
  port: number;
}

const MIN_JWT_SECRET_LENGTH = 32;
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

  const jwtSecret = env.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must contain at least ${MIN_JWT_SECRET_LENGTH} non-whitespace characters`);
  }

  const rawPort = env.PORT ?? String(DEFAULT_PORT);
  if (!/^[0-9]+$/.test(rawPort)) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return { databaseUrl, jwtSecret, port };
}
