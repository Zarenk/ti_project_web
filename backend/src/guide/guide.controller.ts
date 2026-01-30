import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  StreamableFile,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { GuideService } from './guide.service';
import { CreateGuideDto } from './dto/create-guide.dto';
import { zipSignedXmlFromString } from './utils/zip-signed-xml';
import { generateDespatchXML } from './utils/generate-despatch-xml';
import { FirmadorJavaService } from './firmador-java.service';

@Controller('guide')
export class GuideController {
  constructor(
    private readonly guideService: GuideService,
    private readonly firmadorJavaService: FirmadorJavaService,
  ) {}

  @Post()
  async generarGuia(@Body() dto: CreateGuideDto) {
    return this.guideService.generarGuia(dto);
  }

  @Post('validate')
  async validarGuia(@Body() dto: CreateGuideDto) {
    return this.guideService.validateGuide(dto);
  }

  @Post('send-rest')
  async enviarGuiaRest(@Body() dto: CreateGuideDto) {
    try {
      console.log('âœ… Entrando al controlador enviarGuiaRest');
      const serie = dto.serie?.trim() || 'T001';
      const correlativo = dto.correlativo?.trim() || '00012345';

      const xml = generateDespatchXML(dto, serie, correlativo);
      console.log('ðŸ“ XML generado:', xml.slice(0, 300));
      const xmlFirmado = await this.firmadorJavaService.firmarXmlConJava(xml);
      console.log('ðŸ” XML firmado (inicio):', xmlFirmado.slice(0, 300));
      const zipBuffer = zipSignedXmlFromString(
        xmlFirmado,
        dto.numeroDocumentoRemitente,
        `${serie}-${correlativo}`,
      );
      console.log('ðŸ“¦ ZIP generado con tamaÃ±o:', zipBuffer.length);
      const nombreArchivo = `${dto.numeroDocumentoRemitente}-09-${serie}-${correlativo}.zip`;

      const resultado = await this.guideService.sendGuideToSunatRest(
        zipBuffer,
        nombreArchivo,
      );
      return resultado;
    } catch (err: any) {
      throw new InternalServerErrorException({
        message: 'Error SUNAT',
        detail: err?.message ?? err,
        response: err?.response?.data ?? null,
      });
    }
  }

  @Get('shipping-guides')
  findAll() {
    return this.guideService.findAllShippingGuides();
  }

  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return this.guideService.getGuideStatus(Number(id));
  }

  @Get(':id/files/:type')
  async downloadFile(
    @Param('id') id: string,
    @Param('type') type: 'xml' | 'zip' | 'cdr',
    @Res({ passthrough: true }) res: Response,
  ) {
    const filePath = await this.guideService.getGuideFilePath(Number(id), type);
    if (type === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
    } else {
      res.setHeader('Content-Type', 'application/zip');
    }
    return new StreamableFile(createReadStream(filePath));
  }
}




