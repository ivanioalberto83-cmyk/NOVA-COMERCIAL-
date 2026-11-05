import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PasswordService } from '../src/auth/password.service';

describe('Argon2id password service', () => {
  const passwords = new PasswordService();

  it('stores a one-way hash and verifies the original password', async () => {
    const password = 'NOVA-Strong-Passphrase-2026!';
    const hash = await passwords.hash(password);
    assert.notEqual(hash, password);
    assert.equal(await passwords.verify(hash, password), true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await passwords.hash('NOVA-Strong-Passphrase-2026!');
    assert.equal(await passwords.verify(hash, 'incorrect-password'), false);
  });

  it('rejects passwords outside accepted length bounds', async () => {
    await assert.rejects(passwords.hash('short'), /12 characters/);
    await assert.rejects(passwords.hash('x'.repeat(129)), /128 characters/);
  });

  it('fails closed for malformed stored hashes', async () => {
    assert.equal(await passwords.verify('not-a-hash', 'some-password'), false);
  });
});
