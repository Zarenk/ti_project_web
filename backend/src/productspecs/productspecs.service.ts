import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductSpecDto } from './dto/create-productspec.dto';
import { UpdateProductSpecDto } from './dto/update-productspec.dto';

@Injectable()
export class ProductspecsService {
  constructor(private prisma: PrismaService) {}

  create(productId: number, dto: CreateProductSpecDto) {
    return this.prisma.productSpecification.create({
      data: {
        ...dto,
        productId,
      },
    });
  }

  findByProduct(productId: number) {
    return this.prisma.productSpecification.findUnique({
      where: { productId },
    });
  }

  update(productId: number, dto: UpdateProductSpecDto) {
    return this.prisma.productSpecification.update({
      where: { productId },
      data: dto,
    });
  }
}
