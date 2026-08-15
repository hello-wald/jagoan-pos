import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../../clients/clients.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [AuthController],
})
export class AuthModule {}
