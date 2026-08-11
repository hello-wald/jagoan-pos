import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AuthModule } from './auth/auth.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: [resolve(process.cwd(),'../../.env')],
      validationSchema: Joi.object({
        GATEWAY_PORT: Joi.number().integer().min(1).max(65535).default(3000), 
        CORE_HOST: Joi.string().default('localhost'),
        CORE_TCP_PORT: Joi.number().integer().min(1).max(65535).default(4001),
        JWT_SECRET: Joi.string().min(16).required()
      })
    }),
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
