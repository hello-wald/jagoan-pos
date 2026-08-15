import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@jagoan-pos/contracts';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
