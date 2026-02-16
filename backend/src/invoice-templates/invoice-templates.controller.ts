import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
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

  private parseNumericId(id: string): number {
    const parsed = Number.parseInt(id, 10);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(
        'Validation failed (numeric string is expected)',
      );
    }
    return parsed;
  }

  @Get()
  findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ) {
    return this.invoiceTemplatesService.findAll(includeInactive);
  }

  @Get(':id')
  findOne(@Param('id') idParam: string) {
    return this.invoiceTemplatesService.findOne(this.parseNumericId(idParam));
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
  update(@Param('id') idParam: string, @Body() dto: UpdateInvoiceTemplateDto) {
    return this.invoiceTemplatesService.update(
      this.parseNumericId(idParam),
      dto,
    );
  }
}
