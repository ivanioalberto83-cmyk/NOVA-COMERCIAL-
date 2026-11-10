import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateEnvironment } from '../config/environment';

describe('validateEnvironment', () => {
  const valid = {
    DATABASE_URL: 'postgresql://nova_test:secret@localhost:5432/nova_test?schema=nova_core',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'test-publishable-key',
  };

  it('rejects a missing database URL before the server starts', () => {
    assert.throws(() => validateEnvironment({ ...valid, DATABASE_URL: undefined }), /DATABASE_URL/);
  });

  it('rejects a database URL targeting a schema other than nova_core', () => {
    assert.throws(() => validateEnvironment({
      ...valid,
      DATABASE_URL: 'postgresql://nova_test:secret@localhost:5432/nova_test?schema=public',
    }), /nova_core/);
  });

  it('requires a valid Supabase URL and publishable/anon key', () => {
    assert.throws(() => validateEnvironment({ ...valid, SUPABASE_URL: undefined }), /SUPABASE_URL/);
    assert.throws(() => validateEnvironment({ ...valid, SUPABASE_URL: 'not-a-url' }), /SUPABASE_URL/);
    assert.throws(() => validateEnvironment({ ...valid, SUPABASE_ANON_KEY: undefined }), /SUPABASE_ANON_KEY/);
  });

  it('rejects malformed database URLs and unsafe ports', () => {
    assert.throws(() => validateEnvironment({ ...valid, DATABASE_URL: 'not-a-url' }), /DATABASE_URL/);
    assert.throws(() => validateEnvironment({ ...valid, PORT: '70000' }), /PORT/);
    assert.throws(() => validateEnvironment({ ...valid, PORT: 'abc' }), /PORT/);
  });

  it('returns validated Supabase configuration with a safe default port', () => {
    assert.deepEqual(validateEnvironment(valid), {
      databaseUrl: valid.DATABASE_URL,
      supabaseUrl: valid.SUPABASE_URL,
      supabaseAnonKey: valid.SUPABASE_ANON_KEY,
      port: 3001,
    });
  });
});
