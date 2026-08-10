import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { type Request } from "express";
import { type JwtPayload } from "@app-k/shared";


export const CurrentUser = createParamDecorator( 
    (data: keyof JwtPayload | undefined /*sbnrnya bisa keyof user object */, ctx: ExecutionContext ) => {
        const request = ctx.switchToHttp().getRequest<Request & {user: JwtPayload}>() // ntr bisa ganti aja type usernya ke object user beneran
        return data ? request.user[data] : request.user
    }
)