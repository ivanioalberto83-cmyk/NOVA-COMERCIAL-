import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'nova.security.public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
