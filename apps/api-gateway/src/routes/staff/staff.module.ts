import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../../clients/clients.module';
import { StaffController } from './staff.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [StaffController],
})
export class StaffModule {}
