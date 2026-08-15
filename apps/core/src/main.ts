import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { CoreEnv } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const context = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const config = context.get(ConfigService<CoreEnv, true>);
  const host = config.get('CORE_HOST', { infer: true });
  const port = config.get('CORE_TCP_PORT', { infer: true });
  await context.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host, port },
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  await app.listen();
  app.get(Logger).log(`core listening on tcp://${host}:${port}`);
}

void bootstrap();
