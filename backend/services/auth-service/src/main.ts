import 'reflect-metadata';
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import pino from 'pino';

import { AuthModule } from './auth.module';
import { ApiConfigService } from './shared/config';

async function bootstrap(): Promise<void> {
  const config = new ApiConfigService(); // validates env — fail fast

  const app = await NestFactory.create(AuthModule, { bufferLogs: true });
  app.useLogger(app.get(Logger)); // route Nest's own logs through pino too

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks(); // DB pool closes cleanly on SIGTERM

  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Vici · auth-service')
        .setDescription('Identity bounded context. Public routes go through Kong.')
        .setVersion('1.0')
        .addTag('auth')
        .build(),
    ),
  );

  await app.listen(config.appPort);
  app.get(Logger).log(`auth-service listening on :${config.appPort} (docs at /docs)`, 'bootstrap');
}

void bootstrap().catch((error: unknown) => {
  pino().fatal(
    { err: error instanceof Error ? error : { message: String(error) } },
    'auth-service failed to start',
  );
  process.exitCode = 1;
});
