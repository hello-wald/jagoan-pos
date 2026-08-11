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
        name: 'CORE_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          return {
            transport: Transport.TCP,
            options: {
              host: config.get<string>('CORE_HOST'),
              port: Number(config.get<string>('CORE_TCP_PORT'))
            }
          }
        }
      }
    ]),
   ],
  controllers: [AuthController],
  providers: [JwtStrategy, RolesGuard],
  exports: [ClientsModule]
})
export class AuthModule {}
