import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { CreditNotesService } from './credit-notes.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';

@UseGuards(JwtAuthGuard)
@Controller('credit-notes')
export class CreditNotesController {
  constructor(private readonly service: CreditNotesService) {}

  @Post()
  async create(
    @Body() dto: CreateCreditNoteDto,
    @CurrentTenant() tenant: any,
  ) {
    return this.service.create(dto, tenant);
  }

  @Get()
  async findAll(@CurrentTenant() tenant: any) {
    return this.service.findAll(tenant);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: any,
  ) {
    return this.service.findOne(id, tenant);
  }
}
