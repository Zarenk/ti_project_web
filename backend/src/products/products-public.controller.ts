import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('public/products')
@UseGuards(TenantRequiredGuard)
export class ProductsPublicController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('migrationStatus') migrationStatus?: string) {
    const normalized =
      migrationStatus === 'legacy' || migrationStatus === 'migrated'
        ? migrationStatus
        : undefined;
    return this.productsService.findAll({ migrationStatus: normalized });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un numero valido.');
    }
    return this.productsService.findOne(numericId);
  }
}
