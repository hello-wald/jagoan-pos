import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ZodValidationPipe } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.CORE_HOST,
        port: Number(process.env.CORE_TCP_PORT),
      },
    },
  );
  app.useGlobalPipes(new ZodValidationPipe())
    
  await app.listen();
}
bootstrap();
