import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path'; // Ensure 'join' is imported for path handling

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // PARA COLOCAR PREVIAMENTE EN LA URL /API/

  //DOCUMENTACION SWAGGER
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  //DOCUMENTACION SWAGGER

  // Aumentar el límite de tamaño de la solicitud
  app.use(bodyParser.json({ limit: '10mb' })); // Aumenta el límite a 10 MB
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.enableCors({
    origin: '*', // Permitir todas las solicitudes (puedes restringirlo a tu red local si es necesario)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Servir archivos estáticos desde la carpeta "uploads"
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
