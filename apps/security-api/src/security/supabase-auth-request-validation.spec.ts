import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { SupabaseAuthRequestValidationPipe } from '../auth/supabase-auth-request-validation.pipe';

describe('SupabaseAuthRequestValidationPipe', () => {
  const login = new SupabaseAuthRequestValidationPipe('login');
  const refresh = new SupabaseAuthRequestValidationPipe('refresh');
  const valid = {
    email: 'operator@example.test',
    password: 'NOVA-Strong-Passphrase-2026!',
    organizationId: 'd4a1c111-3c32-4a45-9a0b-31d9f4c9a111',
    productCode: 'nova-comercial',
  };

  it('accepts a valid login request and rejects passwords shorter than the policy', () => {
    assert.deepEqual(login.transform(valid), valid);
    assert.throws(() => login.transform({ ...valid, password: 'short' }), BadRequestException);
  });

  it('accepts only product codes compatible with the live nova_core product constraint', () => {
    assert.deepEqual(login.transform(valid), valid);
    assert.throws(() => login.transform({ ...valid, productCode: '1nova' }), BadRequestException);
    assert.throws(() => login.transform({ ...valid, productCode: 'x' }), BadRequestException);
    assert.throws(() => login.transform({ ...valid, productCode: 'NOVA-COMERCIAL' }), BadRequestException);
  });

  it('rejects extra properties and malformed refresh tokens', () => {
    assert.throws(() => login.transform({ ...valid, role: 'admin' }), BadRequestException);
    assert.deepEqual(refresh.transform({ refreshToken: 'R'.repeat(64), organizationId: valid.organizationId, productCode: valid.productCode }), {
      refreshToken: 'R'.repeat(64),
      organizationId: valid.organizationId,
      productCode: valid.productCode,
    });
  });
});
