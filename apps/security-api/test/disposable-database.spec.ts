import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertDisposableDatabaseUrl } from './disposable-database';

describe('destructive integration database guard', () => {
  it('allows only the explicitly enabled local disposable database', () => {
    assert.doesNotThrow(() => assertDisposableDatabaseUrl({
      NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE: 'true',
      DATABASE_URL: 'postgresql://nova_security_local:nova_security_local@localhost:54329/nova_security_local?schema=public',
    }));
  });

  it('allows the dedicated ephemeral CI database', () => {
    assert.doesNotThrow(() => assertDisposableDatabaseUrl({
      NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE: 'true',
      DATABASE_URL: 'postgresql://nova_security_test:nova_security_test@127.0.0.1:5432/nova_security_test?schema=public',
    }));
  });

  it('rejects destructive tests unless the explicit opt-in is enabled', () => {
    assert.throws(() => assertDisposableDatabaseUrl({
      DATABASE_URL: 'postgresql://nova_security_local:nova_security_local@localhost:54329/nova_security_local?schema=public',
    }), /NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE/);
  });

  it('rejects remote hosts even when the database name looks disposable', () => {
    assert.throws(() => assertDisposableDatabaseUrl({
      NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE: 'true',
      DATABASE_URL: 'postgresql://user:password@db.example.com:5432/nova_security_test?schema=public',
    }), /local disposable PostgreSQL/);
  });

  it('rejects unapproved database names and malformed URLs', () => {
    assert.throws(() => assertDisposableDatabaseUrl({
      NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE: 'true',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/postgres?schema=public',
    }), /database name/);
    assert.throws(() => assertDisposableDatabaseUrl({
      NOVA_ALLOW_DESTRUCTIVE_TEST_DATABASE: 'true',
      DATABASE_URL: 'not-a-database-url',
    }), /valid PostgreSQL DATABASE_URL/);
  });
});
