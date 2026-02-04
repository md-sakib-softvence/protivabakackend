import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract user from request
 * @example @GetUser() user: User
 * @example @GetUser('id') userId: string
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);