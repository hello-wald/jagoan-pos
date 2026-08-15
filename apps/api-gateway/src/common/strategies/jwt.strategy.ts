import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser, JwtPayload } from '@jagoan-pos/contracts';
import { CoreClient } from '../../clients/core.client';
import type { GatewayEnv } from '../../config/env.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<GatewayEnv, true>,
    private readonly core: CoreClient,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      ignoreExpiration: false,
    });
  }

  // Re-read the user on every request so a deactivated account loses access
  // immediately rather than when its token expires.
  validate(payload: JwtPayload): Promise<AuthUser> {
    return this.core.send('auth.getUserById', { userId: payload.sub });
  }
}
