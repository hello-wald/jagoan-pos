import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import type { GatewayEnv } from './config/env.schema';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new RpcExceptionFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Jagoan POS API')
    .setDescription('API Gateway documentation')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig), {
    useGlobalPrefix: true,
  });

  const port = app.get(ConfigService<GatewayEnv, true>).get('GATEWAY_PORT', { infer: true });
  await app.listen(port);
  app.get(Logger).log(`api-gateway listening on http://0.0.0.0:${port}/api`);
}

void bootstrap();
