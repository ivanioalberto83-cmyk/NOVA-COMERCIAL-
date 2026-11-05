import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordService {
  async hash(_password: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async verify(_hash: string, _password: string): Promise<boolean> {
    return false;
  }
}
