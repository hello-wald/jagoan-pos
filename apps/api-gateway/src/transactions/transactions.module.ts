import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../clients/clients.module';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
