import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
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

  @Post('send-rest')
  async enviarGuiaRest(@Body() dto: CreateGuideDto) {
    console.log('✅ Entrando al controlador enviarGuiaRest');
    const serie = 'T001'; // puedes parametrizar si deseas
    const correlativo = '00012345'; // igual, puedes generar dinámicamente

    const xml = generateDespatchXML(dto, serie, correlativo);
    console.log('📝 XML generado:', xml.slice(0, 300));
    const xmlFirmado = await this.firmadorJavaService.firmarXmlConJava(xml);
    console.log('🔐 XML firmado (inicio):', xmlFirmado.slice(0, 300));
    const zipBuffer = zipSignedXmlFromString(
      xmlFirmado,
      dto.numeroDocumentoRemitente,
      `${serie}-${correlativo}`,
    );
    console.log('📦 ZIP generado con tamaño:', zipBuffer.length);
    const nombreArchivo = `${dto.numeroDocumentoRemitente}-09-${serie}-${correlativo}.zip`;

    const resultado = await this.guideService.sendGuideToSunatRest(
      zipBuffer,
      nombreArchivo,
    );
    return resultado;
  }

  @Get('shipping-guides')
  findAll() {
    return this.guideService.findAllShippingGuides();
  }
}
