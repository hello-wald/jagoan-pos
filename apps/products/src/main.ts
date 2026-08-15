import { config as loadEnvFile } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ENV_FILE_PATH, productsEnvSchema } from './config/env.schema';

async function bootstrap(): Promise<void> {
  loadEnvFile({ path: ENV_FILE_PATH });
  const { PRODUCTS_HOST: host, PRODUCTS_TCP_PORT: port } = productsEnvSchema.parse(process.env);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host, port },
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.listen();
  app.get(Logger).log(`products listening on tcp://${host}:${port}`);
}
void bootstrap();
