import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateEnvironment } from '../config/environment';

describe('validateEnvironment', () => {
  const valid = {
    DATABASE_URL: 'postgresql://nova_test:secret@localhost:5432/nova_test?schema=nova_core',
    JWT_SECRET: 'a'.repeat(48),
  };

  it('rejects a missing database URL before the server starts', () => {
    assert.throws(
      () => validateEnvironment({ ...valid, DATABASE_URL: undefined }),
      /DATABASE_URL/,
    );
  });

  it('rejects a database URL targeting a schema other than nova_core', () => {
    assert.throws(
      () => validateEnvironment({
        ...valid,
        DATABASE_URL: 'postgresql://nova_test:secret@localhost:5432/nova_test?schema=public',
      }),
      /nova_core/,
    );
  });

  it('rejects a missing or weak JWT secret', () => {
    assert.throws(() => validateEnvironment({ ...valid, JWT_SECRET: undefined }), /JWT_SECRET/);
    assert.throws(() => validateEnvironment({ ...valid, JWT_SECRET: 'short' }), /JWT_SECRET/);
  });

  it('rejects malformed database URLs and unsafe ports', () => {
    assert.throws(() => validateEnvironment({ ...valid, DATABASE_URL: 'not-a-url' }), /DATABASE_URL/);
    assert.throws(() => validateEnvironment({ ...valid, PORT: '70000' }), /PORT/);
    assert.throws(() => validateEnvironment({ ...valid, PORT: 'abc' }), /PORT/);
  });

  it('returns a validated configuration with a safe default port', () => {
    assert.deepEqual(validateEnvironment(valid), {
      databaseUrl: valid.DATABASE_URL,
      jwtSecret: valid.JWT_SECRET,
      port: 3001,
    });
  });
});
