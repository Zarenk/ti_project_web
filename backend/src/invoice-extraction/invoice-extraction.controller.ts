import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { AssignTemplateDto } from './dto/assign-template.dto';
import { SubmitCorrectionDto } from './dto/submit-correction.dto';

@Controller('invoice-samples')
export class InvoiceExtractionController {
  constructor(
    private readonly invoiceExtractionService: InvoiceExtractionService,
  ) {}

  @Get('entry/:entryId')
  findByEntry(
    @Param('entryId', ParseIntPipe) entryId: number,
    @Query('includeLogs', ParseBoolPipe) includeLogs = false,
  ) {
    return this.invoiceExtractionService.findByEntry(entryId, includeLogs);
  }

  @Get(':sampleId/logs')
  findLogs(@Param('sampleId', ParseIntPipe) sampleId: number) {
    return this.invoiceExtractionService.findLogs(sampleId);
  }

  @Post(':sampleId/template')
  assignTemplate(
    @Param('sampleId', ParseIntPipe) sampleId: number,
    @Body() dto: AssignTemplateDto,
  ) {
    return this.invoiceExtractionService.assignTemplate(sampleId, dto);
  }

  @Post(':sampleId/corrections')
  submitCorrection(
    @Param('sampleId', ParseIntPipe) sampleId: number,
    @Body() dto: SubmitCorrectionDto,
  ) {
    return this.invoiceExtractionService.recordCorrection(sampleId, dto);
  }
}
