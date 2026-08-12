import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy, OnModuleInit{
    private logger = new Logger(PrismaService.name)
    constructor(private readonly configService:ConfigService){
        const adapter = new PrismaPg({ connectionString: configService.get<string>('CORE_DATABASE_URL') })
        super({adapter})
    }

    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log('Prisma successfully connected')
        } catch (error) {
            this.logger.error('Prisma error: ' + error)
        }

    }

    async onModuleDestroy() {
        await this.$disconnect()
    }




}
