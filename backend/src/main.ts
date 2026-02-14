import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path'; // Ensure 'join' is imported for path handling
import { ValidationPipe } from '@nestjs/common';
import { MetricsService } from './metrics/metrics.service';
import { TelemetryInterceptor } from './metrics/trace.interceptor';
import { TenantHeaderSanitizerMiddleware } from './common/middleware/tenant-header.middleware';
import { PrismaService } from './prisma/prisma.service';
import { TenantSlugResolverMiddleware } from './common/middleware/tenant-slug-resolver.middleware';
import {
  getAllowedOrigins,
  isAllowedOrigin,
} from './common/cors/allowed-origins';
import { TenantExceptionFilter } from './common/filters/tenant-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new TenantExceptionFilter());
  const metrics = app.get(MetricsService);
  const telemetryEnabled = process.env.DISABLE_TELEMETRY !== 'true';
  if (telemetryEnabled) {
    app.useGlobalInterceptors(new TelemetryInterceptor(metrics));
    await import('./metrics/tracing');
  }

  console.log('[CORS]', getAllowedOrigins());

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-org-id',
      'x-company-id',
      'x-org-unit-id',
      'x-tenant-slug',
    ],
    exposedHeaders: [
      'x-site-settings-updated-at',
      'x-site-settings-created-at',
    ],
  });

  // Serve static files before applying the global prefix so they remain
  // accessible without "/api" in the path
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // PARA COLOCAR PREVIAMENTE EN LA URL /API/
  app.setGlobalPrefix('api');

  const headerSanitizer = new TenantHeaderSanitizerMiddleware();
  app.use('/api', (req, res, next) => headerSanitizer.use(req, res, next));

  const prisma = app.get(PrismaService);
  const slugResolver = new TenantSlugResolverMiddleware(prisma);
  app.use('/api', (req, res, next) => slugResolver.use(req, res, next));

  // Logging justo antes del ValidationPipe para verificar cómo llegan las cabeceras sanitizadas
  app.use('/api', (req, _res, next) => {
    const headerValues = ['x-org-id', 'x-company-id', 'x-org-unit-id']
      .map((name) => `${name}=${req.headers[name] ?? '??'}`)
      .join(', ');
    console.log(
      `[tenant-headers-before-validation] ${req.method} ${req.originalUrl} ${headerValues}`,
    );
    next();
  });

  // Habilitar la validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos no definidos en DTO
      forbidNonWhitelisted: true, // lanza error si llegan campos extras
      transform: true, // transforma automáticamente el payload a la clase
    }),
  );

  // Servir archivos estáticos desde la carpeta "uploads/sunat"
  app.use(
    '/sunat.zip/facturas',
    express.static(join(__dirname, '..', 'sunat.zip', 'facturas')),
  );

  //DOCUMENTACION SWAGGER
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .addTag('accounts')
    .addTag('journals')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  //DOCUMENTACION SWAGGER

  // Aumentar el límite de tamaño de la solicitud
  app.use(bodyParser.json({ limit: '10mb' })); // Aumenta el límite a 10 MB
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  if (process.env.ADSLAB_ENABLED === 'true') {
    const { setupAdslabMonitoring } = await import('./adslab/monitoring');
    setupAdslabMonitoring();
  }

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
void bootstrap();
