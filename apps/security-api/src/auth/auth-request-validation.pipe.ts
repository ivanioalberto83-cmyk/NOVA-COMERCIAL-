import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export type AuthRequestKind = 'login' | 'refresh';

export interface AuthLoginRequest {
  email: string;
  password: string;
  organizationId: string;
  productCode: string;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REFRESH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  return actual.length === required.length && actual.every((key, index) => key === required[index]);
}

@Injectable()
export class AuthRequestValidationPipe implements PipeTransform {
  constructor(private readonly kind: AuthRequestKind) {}

  transform(value: unknown): AuthLoginRequest | AuthRefreshRequest {
    if (!isRecord(value)) throw new BadRequestException('Invalid authentication request');

    if (this.kind === 'login') {
      const valid =
        hasExactKeys(value, ['email', 'password', 'organizationId', 'productCode']) &&
        typeof value.email === 'string' &&
        value.email.length <= 320 &&
        EMAIL_PATTERN.test(value.email) &&
        typeof value.password === 'string' &&
        value.password.length >= 12 &&
        value.password.length <= 128 &&
        typeof value.organizationId === 'string' &&
        UUID_PATTERN.test(value.organizationId) &&
        typeof value.productCode === 'string' &&
        value.productCode.length <= 80 &&
        PRODUCT_CODE_PATTERN.test(value.productCode);

      if (!valid) throw new BadRequestException('Invalid authentication request');
      return value as unknown as AuthLoginRequest;
    }

    const valid =
      hasExactKeys(value, ['refreshToken']) &&
      typeof value.refreshToken === 'string' &&
      REFRESH_TOKEN_PATTERN.test(value.refreshToken);
    if (!valid) throw new BadRequestException('Invalid authentication request');
    return value as unknown as AuthRefreshRequest;
  }
}
