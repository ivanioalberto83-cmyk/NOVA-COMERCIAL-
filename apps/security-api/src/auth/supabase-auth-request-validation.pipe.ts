import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

type Kind = 'login' | 'refresh';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRODUCT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

@Injectable()
export class SupabaseAuthRequestValidationPipe implements PipeTransform {
  constructor(private readonly kind: Kind) {}

  transform(value: unknown) {
    if (!isRecord(value)) throw new BadRequestException('Invalid authentication request');
    const valid = this.kind === 'login'
      ? exactKeys(value, ['email', 'password', 'organizationId', 'productCode']) &&
        typeof value.email === 'string' && value.email.length <= 320 && EMAIL.test(value.email) &&
        typeof value.password === 'string' && value.password.length >= 1 && value.password.length <= 128 &&
        typeof value.organizationId === 'string' && UUID.test(value.organizationId) &&
        typeof value.productCode === 'string' && value.productCode.length <= 80 && PRODUCT.test(value.productCode)
      : exactKeys(value, ['refreshToken', 'organizationId', 'productCode']) &&
        typeof value.refreshToken === 'string' && value.refreshToken.length >= 20 && value.refreshToken.length <= 2048 &&
        typeof value.organizationId === 'string' && UUID.test(value.organizationId) &&
        typeof value.productCode === 'string' && value.productCode.length <= 80 && PRODUCT.test(value.productCode);
    if (!valid) throw new BadRequestException('Invalid authentication request');
    return value;
  }
}
