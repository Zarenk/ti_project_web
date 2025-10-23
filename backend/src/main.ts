import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path'; // Ensure 'join' is imported for path handling
import { ValidationPipe } from '@nestjs/common';
import { MetricsService } from './metrics/metrics.service';
import { TelemetryInterceptor } from './metrics/trace.interceptor';
import './metrics/tracing';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const metrics = app.get(MetricsService);
  app.useGlobalInterceptors(new TelemetryInterceptor(metrics));

  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) =>
    o.trim(),
  ) || ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Serve static files before applying the global prefix so they remain
  // accessible without "/api" in the path
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // PARA COLOCAR PREVIAMENTE EN LA URL /API/
  app.setGlobalPrefix('api');
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
