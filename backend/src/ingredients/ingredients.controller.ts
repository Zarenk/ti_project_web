import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Controller('ingredients')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class IngredientsController {
  constructor(private readonly service: IngredientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create ingredient' })
  create(
    @Body() dto: CreateIngredientDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.create(
      dto,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.findAll(
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.service.findOne(
      numericId,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.service.update(
      numericId,
      dto,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const numericId = parseInt(id, 10);
    if (Number.isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.service.remove(
      numericId,
      organizationId === undefined ? undefined : organizationId,
      companyId === undefined ? undefined : companyId,
    );
  }
}
