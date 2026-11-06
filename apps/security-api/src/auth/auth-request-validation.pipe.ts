import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export type AuthRequestKind = 'login' | 'refresh';

@Injectable()
export class AuthRequestValidationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return value;
  }
}
