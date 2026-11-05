import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    if (typeof password !== 'string' || password.length < 12) {
      throw new Error('Password must contain at least 12 characters');
    }
    if (password.length > 128) {
      throw new Error('Password must not exceed 128 characters');
    }
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    if (typeof hash !== 'string' || !hash.startsWith('$argon2id$') ||
        typeof password !== 'string' || password.length === 0 || password.length > 128) {
      return false;
    }
    try {
      return await argon2.verify(hash, password, { type: argon2.argon2id });
    } catch {
      return false;
    }
  }
}
