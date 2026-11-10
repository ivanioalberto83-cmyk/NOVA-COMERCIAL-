import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SupabaseAuthClient } from '../auth/supabase-auth.client';

describe('SupabaseAuthClient', () => {
  it('signs in through Supabase Auth and returns the provider session', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = new SupabaseAuthClient(
      'https://example.supabase.co',
      'test-publishable-key',
      async (input, init) => {
        calls.push({ url: String(input), init });
        return new Response(JSON.stringify({
          access_token: 'supabase-access',
          refresh_token: 'supabase-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111', email: 'user@example.test' },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    );

    const session = await client.signInWithPassword('user@example.test', 'correct horse battery staple');

    assert.equal(calls[0].url, 'https://example.supabase.co/auth/v1/token?grant_type=password');
    assert.equal((calls[0].init?.headers as Record<string, string>).apikey, 'test-publishable-key');
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
      email: 'user@example.test',
      password: 'correct horse battery staple',
    });
    assert.equal(session.accessToken, 'supabase-access');
    assert.equal(session.refreshToken, 'supabase-refresh');
    assert.equal(session.user.id, 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111');
  });

  it('refreshes a session through Supabase Auth without persisting refresh tokens locally', async () => {
    const client = new SupabaseAuthClient(
      'https://example.supabase.co',
      'test-publishable-key',
      async (_input, init) => {
        assert.equal(String(init?.body), JSON.stringify({ refresh_token: 'refresh-value' }));
        return new Response(JSON.stringify({
          access_token: 'rotated-access',
          refresh_token: 'rotated-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111', email: 'user@example.test' },
        }), { status: 200 });
      },
    );

    const session = await client.refreshSession('refresh-value');
    assert.equal(session.accessToken, 'rotated-access');
    assert.equal(session.refreshToken, 'rotated-refresh');
  });

  it('validates access tokens against the Supabase Auth user endpoint', async () => {
    const client = new SupabaseAuthClient(
      'https://example.supabase.co',
      'test-publishable-key',
      async (input, init) => {
        assert.equal(String(input), 'https://example.supabase.co/auth/v1/user');
        assert.equal((init?.headers as Record<string, string>).authorization, 'Bearer access-value');
        return new Response(JSON.stringify({
          id: 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
          email: 'user@example.test',
        }), { status: 200 });
      },
    );

    const user = await client.getUser('access-value');
    assert.equal(user.id, 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111');
  });

  it('rejects provider errors and never treats an invalid token as an authenticated user', async () => {
    const client = new SupabaseAuthClient(
      'https://example.supabase.co',
      'test-publishable-key',
      async () => new Response(JSON.stringify({ message: 'Invalid login credentials' }), { status: 400 }),
    );

    await assert.rejects(
      client.signInWithPassword('user@example.test', 'wrong-password'),
      /Supabase Auth request failed/,
    );
    await assert.rejects(client.getUser('invalid-token'), /Supabase Auth request failed/);
  });
});
