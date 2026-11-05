const approvedDatabases = new Map<string, number>([
  ['nova_security_local', 54329],
  ['nova_security_test', 5432],
]);

/**
 * Destructive persistence tests are restricted to the explicitly opted-in,
 * local PostgreSQL databases provisioned for this test suite.
 */
export function assertDisposableDatabaseUrl(env: NodeJS.ProcessEnv): void {
  if (env.NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE !== 'true') {
    throw new Error('Set NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE=true only for a disposable local test database');
  }

  let databaseUrl: URL;
  try {
    if (!env.DATABASE_URL) throw new Error('missing DATABASE_URL');
    databaseUrl = new URL(env.DATABASE_URL);
  } catch {
    throw new Error('A valid PostgreSQL DATABASE_URL is required for destructive integration tests');
  }

  if (databaseUrl.protocol !== 'postgres:' && databaseUrl.protocol !== 'postgresql:') {
    throw new Error('Destructive integration tests require a valid PostgreSQL DATABASE_URL');
  }

  if (databaseUrl.hostname !== 'localhost' && databaseUrl.hostname !== '127.0.0.1') {
    throw new Error('Destructive integration tests require a local disposable PostgreSQL host');
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\\//, ''));
  const expectedPort = approvedDatabases.get(databaseName);
  if (!expectedPort || Number(databaseUrl.port) !== expectedPort) {
    throw new Error('Destructive integration tests require an approved disposable database name and port');
  }
}
