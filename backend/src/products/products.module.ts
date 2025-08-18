import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { BrandsService } from 'src/brands/brands.service';
import { ActivityModule } from 'src/activity/activity.module';
import { UploaderService } from '../common/upload/uploader.service';
import { S3Service } from '../common/storage/s3.service';
import { AntivirusService } from '../common/security/antivirus.service';

@Module({
  imports: [ActivityModule],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    PrismaService,
    CategoryService,
    BrandsService,
    UploaderService,
    S3Service,
    AntivirusService,
  ],
  exports: [ProductsService], // 👈 IMPORTANTE: exportarlo
})
export class ProductsModule {}
