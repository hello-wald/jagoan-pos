import { config as loadEnvFile } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ENV_FILE_PATH } from './config/env.schema';

async function bootstrap(): Promise<void> {
  loadEnvFile({ path: ENV_FILE_PATH });

  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.get(Logger).log('outbox-relay started');
}
void bootstrap();
