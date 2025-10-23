import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { ProductspecsService } from './productspecs.service';
import { CreateProductSpecDto } from './dto/create-productspec.dto';
import { UpdateProductSpecDto } from './dto/update-productspec.dto';

@Controller('products/:productId/specs')
export class ProductspecsController {
  constructor(private readonly service: ProductspecsService) {}

  @Post()
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductSpecDto,
  ) {
    const id = parseInt(productId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid product ID');
    return this.service.create(id, dto);
  }

  @Get()
  findOne(@Param('productId') productId: string) {
    const id = parseInt(productId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid product ID');
    return this.service.findByProduct(id);
  }

  @Patch()
  update(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductSpecDto,
  ) {
    const id = parseInt(productId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid product ID');
    return this.service.update(id, dto);
  }
}
