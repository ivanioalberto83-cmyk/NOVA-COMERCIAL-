import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthorizationGuard } from './authorization.guard';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

function makeContext(options: {
  required?: string[];
  classRequired?: string[];
  permissions?: string[];
  publicRoute?: boolean;
  publicController?: boolean;
} = {}) {
  const handler = function route() {};
  class TestController {}
  if (options.required !== undefined) {
    Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, options.required, handler);
  }
  if (options.publicRoute) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  if (options.publicController) Reflect.defineMetadata(IS_PUBLIC_KEY, true, TestController);
  if (options.classRequired !== undefined) {
    Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, options.classRequired, TestController);
  }
  const request = options.permissions === undefined
    ? {}
    : { auth: { permissions: options.permissions } };
  const context = {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return context;
}

describe('AuthorizationGuard', () => {
  const guard = new AuthorizationGuard();

  it('denies protected routes without an explicit permission declaration', () => {
    assert.throws(() => guard.canActivate(makeContext()), ForbiddenException);
  });

  it('allows explicitly public routes without a permission declaration', () => {
    assert.equal(guard.canActivate(makeContext({ publicRoute: true })), true);
    assert.equal(guard.canActivate(makeContext({ publicController: true })), true);
  });

  it('allows a route only when all declared permissions are present', () => {
    assert.equal(guard.canActivate(makeContext({
      required: ['customers:read', 'customers:export'],
      permissions: ['customers:read', 'customers:export', 'customers:update'],
    })), true);
  });

  it('denies a request without an authenticated permission context', () => {
    assert.throws(() => guard.canActivate(makeContext({
      required: ['customers:read'],
    })), ForbiddenException);
  });

  it('denies a request missing any required permission', () => {
    assert.throws(() => guard.canActivate(makeContext({
      required: ['customers:read', 'customers:export'],
      permissions: ['customers:read'],
    })), ForbiddenException);
  });

  it('uses controller-level requirements when the route has no override', () => {
    assert.equal(guard.canActivate(makeContext({
      classRequired: ['reports:read'],
      permissions: ['reports:read'],
    })), true);
  });

  it('fails closed when an empty permission declaration is supplied', () => {
    assert.throws(() => guard.canActivate(makeContext({
      required: [],
      permissions: ['customers:read'],
    })), ForbiddenException);
  });
});
