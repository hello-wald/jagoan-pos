import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesGuard } from './guards/role.guard';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          console.log(config.get<string>('AUTH_HOST'))
          console.log(config.get<string>('AUTH_TCP_PORT'))
          return {
            transport: Transport.TCP,
            options: {
              host: config.get<string>('AUTH_HOST'),
              port: Number(config.get<string>('AUTH_TCP_PORT'))
            }
          }
        }
      }
    ]),
   ],
  controllers: [AuthController],
  providers: [JwtStrategy, RolesGuard]
})
export class AuthModule {}
