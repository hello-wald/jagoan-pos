import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
// import { lastValueFrom } from "rxjs";
import {type JwtPayload} from "@app-k/shared"



@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(private readonly configService: ConfigService){
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

    // ini sementara return jwtpayload dlu ya , nanti return user ny lgsg aja *tanpa pass dll
    validate(payload: JwtPayload): JwtPayload{
        // ini dilakuin nanti pas udah nyala auth service dan inject tokennya
        // const user = await lastValueFrom(
        //     this.authClient.send('auth.getUserById', {
        //         userId: payload.sub
        //     })
        // ) 
        return payload
    }
}