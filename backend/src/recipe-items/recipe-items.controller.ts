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
import { RecipeItemsService } from './recipe-items.service';
import { CreateRecipeItemDto } from './dto/create-recipe-item.dto';
import { UpdateRecipeItemDto } from './dto/update-recipe-item.dto';

@Controller('recipe-items')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class RecipeItemsController {
  constructor(private readonly service: RecipeItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create recipe item' })
  create(
    @Body() dto: CreateRecipeItemDto,
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
    @Body() dto: UpdateRecipeItemDto,
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
