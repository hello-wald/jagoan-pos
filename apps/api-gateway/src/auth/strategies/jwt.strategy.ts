import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { lastValueFrom } from "rxjs";
import {type AuthUser, type JwtPayload} from "@jagoan-pos/shared"
import { ClientProxy } from "@nestjs/microservices";



@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(private readonly configService: ConfigService, @Inject('CORE_SERVICE') private readonly authClient:ClientProxy){
        const jwtSecret = configService.get<string>('JWT_SECRET')
        if(!jwtSecret){
            throw new Error('JWT_SECRET is not configured')
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtSecret,
            ignoreExpiration: false,
        });
    }

    async validate(payload: JwtPayload): Promise<AuthUser>{
        const user = await lastValueFrom(
            this.authClient.send<AuthUser, { userId: string }>(
                'auth.getUserById',
                {
                    userId: payload.sub,
                },
            ),
        );
        return user
    }
}
