import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import * as Joi from 'joi';
import { RedisModule } from '@jagoan-pos/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '../../.env')],
      validationSchema: Joi.object({
        CORE_HOST: Joi.string().default('localhost'), 
        CORE_TCP_PORT: Joi.number().integer().min(1).max(65535).default(4001),
        CORE_DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        UPSTASH_REDIS_REST_URL: Joi.string().uri().required(),
        UPSTASH_REDIS_REST_TOKEN: Joi.string().required()
      })
    }),
    PrismaModule,
    AuthModule,
    StaffModule,
    RedisModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
