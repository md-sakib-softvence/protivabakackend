import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';


@Injectable()
export class SubAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request & { user?: any } = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('You must be logged in to access this route');
    }

    if (user.role !== 'SUB_ADMIN') {
      throw new ForbiddenException('You do not have permission to access this route');
    }

    return true;
  }
}