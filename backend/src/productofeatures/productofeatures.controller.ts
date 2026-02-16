import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Delete,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ProductfeaturesService } from './productofeatures.service';
import { CreateProductoFeatureDto } from './dto/create-productofeature.dto';
import { UpdateProductFeatureDto } from './dto/update-productofeature.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('products/:productId/features')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ProductofeaturesController {
  constructor(private readonly service: ProductfeaturesService) {}

  @Post()
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductoFeatureDto,
  ) {
    const id = parseInt(productId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid product ID');
    return this.service.create(id, dto);
  }

  @Get()
  findAll(@Param('productId') productId: string) {
    const id = parseInt(productId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid product ID');
    return this.service.findAll(id);
  }

  @Patch(':featureId')
  update(
    @Param('featureId') featureId: string,
    @Body() dto: UpdateProductFeatureDto,
  ) {
    const id = parseInt(featureId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid feature ID');
    return this.service.update(id, dto);
  }

  @Delete(':featureId')
  remove(@Param('featureId') featureId: string) {
    const id = parseInt(featureId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid feature ID');
    return this.service.remove(id);
  }
}
