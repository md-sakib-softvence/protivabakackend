import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';


// enum UserRole {
//   SUPER_ADMIN
//   SUB_ADMIN
//   PROVIDER
//   CLIENT
// }


@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request & { user?: any } = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('You must be logged in to access this route');
    }

    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You do not have permission to access this route');
    }

    return true;
  }
}