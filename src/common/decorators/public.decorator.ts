import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark route as public (skip JWT authentication)
 * @example @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);