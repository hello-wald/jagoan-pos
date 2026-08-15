import { config as loadEnvFile } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ENV_FILE_PATH, coreEnvSchema } from './config/env.schema';

async function bootstrap(): Promise<void> {
  // The transport options are needed before the DI container exists, so read
  // them straight from the validated env rather than booting a throwaway app.
  loadEnvFile({ path: ENV_FILE_PATH });
  const { CORE_HOST: host, CORE_TCP_PORT: port } = coreEnvSchema.parse(process.env);

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
