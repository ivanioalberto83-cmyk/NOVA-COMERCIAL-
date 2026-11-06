import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { AuthRequestValidationPipe } from '../auth/auth-request-validation.pipe';

describe('AuthRequestValidationPipe', () => {
  const pipe = new AuthRequestValidationPipe();

  it('accepts a valid login payload without modifying it', () => {
    const body = {
      email: 'operator@example.test',
      password: 'a-secure-password',
      organizationId: 'b4f1f2a7-8e13-4b8d-9f7d-7a8b9c0d1e2f',
      productCode: 'nova-comercial',
    };
    assert.deepEqual(pipe.transform(body, { type: 'body', metatype: Object, data: undefined }), body);
  });

  it('rejects a non-object login body and missing required fields', () => {
    assert.throws(() => pipe.transform(null, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
    assert.throws(() => pipe.transform({ email: 'operator@example.test' }, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
  });

  it('rejects malformed email, short passwords and invalid tenant/product identifiers', () => {
    const valid = {
      email: 'operator@example.test',
      password: 'a-secure-password',
      organizationId: 'b4f1f2a7-8e13-4b8d-9f7d-7a8b9c0d1e2f',
      productCode: 'nova-comercial',
    };
    assert.throws(() => pipe.transform({ ...valid, email: 'not-an-email' }, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
    assert.throws(() => pipe.transform({ ...valid, password: 'short' }, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
    assert.throws(() => pipe.transform({ ...valid, organizationId: 'tenant-a' }, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
    assert.throws(() => pipe.transform({ ...valid, productCode: 'NOVA / COMERCIAL' }, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
  });

  it('rejects unexpected properties to prevent mass assignment', () => {
    const valid = {
      email: 'operator@example.test',
      password: 'a-secure-password',
      organizationId: 'b4f1f2a7-8e13-4b8d-9f7d-7a8b9c0d1e2f',
      productCode: 'nova-comercial',
    };
    assert.throws(() => pipe.transform({ ...valid, role: 'admin' }, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
  });

  it('accepts only correctly shaped refresh tokens', () => {
    const valid = { refreshToken: 'A'.repeat(64) };
    assert.deepEqual(pipe.transform(valid, { type: 'body', metatype: Object, data: undefined }), valid);
    assert.throws(() => pipe.transform({ refreshToken: 'short' }, { type: 'body', metatype: Object, data: undefined }), BadRequestException);
  });
});
