import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { RpcErrorFilter } from './common/filters/rpc-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api')
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Application K API')
      .setDescription('API Gateway documentation')
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        bearerFormat: 'JWT',
        scheme: 'bearer'
      })
      .build();
  
  app.useGlobalPipes(new ZodValidationPipe())
  app.useGlobalFilters(new RpcErrorFilter())
  
  const document = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  )

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true
  })

  const port = Number(
    process.env.GATEWAY_PORT ?? '3000'
  )

  await app.listen(port);
}
bootstrap();
