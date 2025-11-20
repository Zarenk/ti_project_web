import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { CreateInvoiceTemplateDto } from './dto/create-invoice-template.dto';
import { UpdateInvoiceTemplateDto } from './dto/update-invoice-template.dto';
import { SuggestInvoiceTemplateDto } from './dto/suggest-invoice-template.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import fs from 'fs';
import path from 'path';

@Controller('invoice-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
export class InvoiceTemplatesController {
  constructor(
    private readonly invoiceTemplatesService: InvoiceTemplatesService,
  ) {}

  @Get()
  findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ) {
    return this.invoiceTemplatesService.findAll(includeInactive);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceTemplatesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateInvoiceTemplateDto) {
    return this.invoiceTemplatesService.create(dto);
  }

  @Post('suggest')
  suggest(@Body() dto: SuggestInvoiceTemplateDto) {
    return this.invoiceTemplatesService.suggestTemplate(dto);
  }

  @Post('suggest-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tmpDir = path.join(process.cwd(), 'tmp');
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          cb(null, tmpDir);
        },
        filename: (req, file, cb) => {
          cb(null, `${Date.now()}-${file.originalname}`);
        },
      }),
    }),
  )
  suggestFromPdf(@UploadedFile() file: Express.Multer.File) {
    return this.invoiceTemplatesService.suggestTemplateFromPdf(file);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceTemplateDto,
  ) {
    return this.invoiceTemplatesService.update(id, dto);
  }
}
