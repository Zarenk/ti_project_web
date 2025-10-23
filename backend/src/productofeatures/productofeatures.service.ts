import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductoFeatureDto } from './dto/create-productofeature.dto';
import { UpdateProductFeatureDto } from './dto/update-productofeature.dto';

@Injectable()
export class ProductfeaturesService {
  constructor(private prisma: PrismaService) {}

  create(productId: number, dto: CreateProductoFeatureDto) {
    return this.prisma.productFeature.create({
      data: {
        ...dto,
        productId,
      },
    });
  }

  findAll(productId: number) {
    return this.prisma.productFeature.findMany({
      where: { productId },
      orderBy: { id: 'asc' },
    });
  }

  update(id: number, dto: UpdateProductFeatureDto) {
    return this.prisma.productFeature.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.productFeature.delete({ where: { id } });
  }
}
