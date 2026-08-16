import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../clients/clients.module';
import { ReportsController } from './reports.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
