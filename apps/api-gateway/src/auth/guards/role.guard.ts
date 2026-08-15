import { AuthUser, UserRole } from "@jagoan-pos/shared";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorator/role.decorator";


@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector:Reflector){}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY, 
            [
                context.getHandler(),
                context.getClass(),
            ]
        )

        if(!requiredRoles) return true

        const request = context.switchToHttp().getRequest<{user?: AuthUser}>();

        if(!request.user || !requiredRoles.includes(request.user.role)){
            throw new ForbiddenException('Insufficient permission')
        }

        return true

    }

}