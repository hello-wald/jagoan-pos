import {config as loadEnvFile} from 'dotenv'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { analyticsEnvSchema, ENV_FILE_PATH } from './config/env.schema';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  loadEnvFile({ path: ENV_FILE_PATH });
  const { ANALYTICS_HOST: host, ANALYTICS_TCP_PORT: port } = analyticsEnvSchema.parse(process.env);


  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {host,port},
    bufferLogs: true
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.listen();
  app.get(Logger).log(`analytics-service listening on tcp://${host}:${port}`);

}
void bootstrap();
