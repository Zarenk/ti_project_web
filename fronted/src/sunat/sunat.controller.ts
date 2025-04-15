import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SunatService } from './sunat.service';

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
}