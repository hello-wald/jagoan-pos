import { Global, Module } from '@nestjs/common';
import { TransactionsPrismaService } from './prisma.service';

@Global()
@Module({
  providers: [TransactionsPrismaService],
  exports: [TransactionsPrismaService],
})
export class TransactionsPrismaModule {}
