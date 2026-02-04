import { SetMetadata } from '@nestjs/common';
import { Permission } from '@prisma/client';


export const PERMISSIONS_KEY = 'permissions';

/**
 * Define required permissions for route
 * @example @Permissions(Permission.MANAGE_USERS, Permission.VIEW_ANALYTICS)
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);