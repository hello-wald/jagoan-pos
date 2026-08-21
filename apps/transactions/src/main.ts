import { config as loadEnvFile } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ENV_FILE_PATH, transactionsEnvSchema } from './config/env.schema';

async function bootstrap(): Promise<void> {
  loadEnvFile({ path: ENV_FILE_PATH });
  const { TRANSACTIONS_TCP_PORT: port } = transactionsEnvSchema.parse(process.env);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.listen();
  app.get(Logger).log(`transactions listening on tcp://0.0.0.0:${port}`);
}
void bootstrap();
