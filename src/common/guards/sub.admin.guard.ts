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

    const allowedRoles = ["SUPER_ADMIN", "SUB_ADMIN"];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this route');
    }

    return true;
  }
}