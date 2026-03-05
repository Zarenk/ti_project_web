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
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { CreditNotesService } from './credit-notes.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { SubscriptionStatusGuard } from 'src/common/guards/subscription-status.guard';
import { RequiresActiveSubscription } from 'src/common/decorators/requires-subscription.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
@ModulePermission('sales')
@Controller('credit-notes')
export class CreditNotesController {
  constructor(private readonly service: CreditNotesService) {}

  @Post()
  @UseGuards(SubscriptionStatusGuard)
  @RequiresActiveSubscription('credit_notes', { maxGraceTier: null })
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
