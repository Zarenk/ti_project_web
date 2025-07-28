import { Controller, Post, Body, BadRequestException, Get, Param, Res, NotFoundException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { SunatService } from './sunat.service';
import { Response } from 'express'; // ✅ Asegúrate de importar esto
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { resolveBackendPath } from 'src/utils/path-utils';

function generarNombreUnico(destino: string, original: string): string {
  const nombreSinExtension = path.parse(original).name;
  const extension = path.extname(original);
  let nombreFinal = original;
  let contador = 1;

  while (fs.existsSync(path.join(destino, nombreFinal))) {
    nombreFinal = `${nombreSinExtension}(${contador})${extension}`;
    contador++;
  }

  return nombreFinal;
}

@Controller('sunat')
export class SunatController {
  constructor(private readonly sunatService: SunatService) {}

  /**
   * Endpoint para enviar documentos a la SUNAT.
   * @param data Datos del documento (factura, boleta, nota de crédito).
   * @returns Respuesta de la SUNAT.
   */
  @Post('send-document')
  async sendDocument(@Body() data: any) {

    if (!data) {
      throw new BadRequestException('El cuerpo de la solicitud no puede estar vacío.');
    }
  
    const { documentType, privateKeyPath= "certificates/private_key_pkcs8.pem", 
      certificatePath="certificates/certificate.crt", ...documentData } = data;

    // Validar que el tipo de documento sea válido
    if (!documentType || !['invoice', 'boleta', 'creditNote'].includes(documentType)) {
      throw new BadRequestException('Tipo de documento no soportado. Use "invoice", "boleta" o "creditNote".');
    }

    // Validar que las rutas de las claves y certificados sean proporcionadas
    if (!privateKeyPath || !certificatePath) {
      throw new BadRequestException('Las rutas de la clave privada y el certificado son obligatorias.');
    }

    try {
      // Llamar al servicio para enviar el documento
      const response = await this.sunatService.sendDocument(
        documentData,
        documentType,
        privateKeyPath,
        certificatePath,
      );

      return {
        message: 'Documento enviado a la SUNAT exitosamente.',
        response,
      };
    } catch (error:any) {
      console.error('Error al enviar el documento a la SUNAT:', error.message);
      throw new BadRequestException('Error al enviar el documento a la SUNAT.');
    }
  }

  @Post('generar-y-enviar')
  async generarYEnviarDocumento(@Body() data: any) {
    if (!data || !data.documentType) {
      throw new BadRequestException('El campo "documentType" es obligatorio.');
    }

    try {
      const respuesta = await this.sunatService.generarYEnviarConSerie(data.documentType);
      return {
        mensaje: 'Serie y numero correlativo generado correctamente...',
        respuesta,
      };
    } catch (error: any) {
      console.error('Error en el endpoint /sunat/generar-y-enviar:', error);
      throw new BadRequestException('Error al extrar la serie y el nro. correlativo...');
    }
  }

  @Post('upload-pdf')
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const nombre = file.originalname;
  
          // Detectar tipo desde el nombre del archivo (ej: 20519857538-01-F001-007.pdf)
          const tipo = nombre.includes('-01-') ? 'factura' : 'boleta';
  
          const dir = resolveBackendPath('comprobantes/pdf', tipo);
  
          // Crear la carpeta si no existe
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
  
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const nombre = file.originalname;
          const tipo = nombre.includes('-01-') ? 'factura' : 'boleta';
          const dir = resolveBackendPath('comprobantes/pdf', tipo);
          // Mantener el nombre original para que coincida con {ruc}-{tipo}-{serie}-{correlativo}.pdf
          cb(null, nombre);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.includes('pdf')) {
          return cb(new BadRequestException('Solo se permiten archivos PDF.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se subió ningún archivo PDF.');
    }

    return {
      message: 'PDF guardado correctamente en el servidor.',
      filename: file.filename,
    };
  }
  
  @Get('pdf/:tipo/:filename')
  getComprobantePdf(
    @Param('tipo') tipo: 'boleta' | 'factura',
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const filePath = this.sunatService.getComprobantePdfPath(tipo, filename);
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(filePath);
    } catch (error:any) {
      throw new NotFoundException(error.message);
    }
  }
}