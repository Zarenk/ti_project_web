import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { Roles } from 'src/users/roles.decorator';
import { RolesGuard } from 'src/users/roles.guard';
import { CreateJournalDto } from './dto/create-journal.dto';
import { Journal, JournalsService } from './journals.service';
import { TenantContextGuard } from 'src/tenancy/tenant-context.guard';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

@ApiTags('journals')
@Controller('accounting/journals')
@UseGuards(JwtAuthGuard, RolesGuard, TenantContextGuard)
export class JournalsController {
  constructor(
    private readonly journalsService: JournalsService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @Post()
  @Roles('ADMIN')
  create(
    @Body() dto: CreateJournalDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Journal {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.journalsService.create(dto, context);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: CreateJournalDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Journal {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.journalsService.update(id, dto, context);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
  ): void {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.journalsService.remove(id, context);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<Journal[]> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.journalsService.findAll(context);
  }
}
