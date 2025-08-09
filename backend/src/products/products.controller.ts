import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuditAction } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';


@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly activityService: ActivityService,
  ) {}

  @Post()
  @ApiOperation({summary: 'Create a product'})    // Swagger 
  async create(@Body() createProductDto: CreateProductDto, @Req() req: Request) {
    const product = await this.productsService.create(createProductDto);
    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Product',
        entityId: product.id.toString(),
        action: AuditAction.CREATED,
        summary: `Producto ${product.name} creado`,
        diff: { after: product } as any,
      },
      req,
    );
    return product;
  }

  @Post('verify-or-create-products')
  async verifyOrCreateProducts(
    @Body()
    products: {
      name: string
      price: number
      description?: string
      brandId?: number
      categoryId?: number
    }[],
  ) {
    return this.productsService.verifyOrCreateProducts(products);
  }

  @Post('upload-image')
    @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads/products',
          filename: (req, file, cb) => {
            const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${unique}${extname(file.originalname)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            return cb(new BadRequestException('Solo se permiten imagenes'), false);
          }
          cb(null, true);
        },
      }),
    )
    uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
      if (!file) {
        throw new BadRequestException('No se proporcionó ninguna imagen');
      }
      const baseUrl =
        process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
      return { url: `${baseUrl}/uploads/products/${file.filename}` };
    }

  @Get()
  @ApiResponse({status: 200, description: 'Return all products'}) // Swagger 
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10); // Convierte el ID a un número entero
    if (isNaN(numericId)) {
    throw new BadRequestException('El ID debe ser un número válido.');
    }
    return this.productsService.findOne(numericId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: Request,
  ) {
    const before = await this.productsService.findOne(+id);
    const updated = await this.productsService.update(+id, updateProductDto);
    const diff: any = { before: {}, after: {} };
    for (const key of Object.keys(updated)) {
      if (JSON.stringify((before as any)[key]) !== JSON.stringify((updated as any)[key])) {
        (diff.before as any)[key] = (before as any)[key];
        (diff.after as any)[key] = (updated as any)[key];
      }
    }
    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Product',
        entityId: updated.id.toString(),
        action: AuditAction.UPDATED,
        summary: `Producto ${updated.name} actualizado`,
        diff,
      },
      req,
    );
    return updated;
  }

  @Patch()
  @ApiOperation({ summary: 'Update multiple products with the same values' }) // Swagger
  @ApiResponse({ status: 200, description: 'Products updated successfully' }) // Swagger
  async updateMany(@Body() updateProductsDto: UpdateProductDto[]) {

    if (!Array.isArray(updateProductsDto) || updateProductsDto.length === 0) {
      throw new BadRequestException('No se proporcionaron productos para actualizar.');
    }

    // Delegar la lógica al servicio
    return this.productsService.updateMany(updateProductsDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const removed = await this.productsService.remove(+id);
    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Product',
        entityId: id,
        action: AuditAction.DELETED,
        summary: `Producto ${removed.name} eliminado`,
        diff: { before: removed } as any,
      },
      req,
    );
    return removed;
  }

  @Delete()
  async removes(@Body('ids') ids: number[]) {
    return this.productsService.removes(ids);
  }

  @Patch(':id/price-sell')
  async updatePriceSell(
    @Param('id') id: string,
    @Body('priceSell') priceSell: number,
  ) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un número válido.');
    }

    if (priceSell <= 0) {
      throw new BadRequestException('El precio de venta debe ser mayor a 0.');
    }

    return this.productsService.update(numericId, { id: numericId, priceSell });
  }

  @Patch(':id/category')
  async updateCategory(
    @Param('id') id: string,
    @Body('categoryId') categoryId: number,
  ) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un número válido.');
    }

    if (!categoryId || isNaN(categoryId)) {
      throw new BadRequestException('El ID de la categoría debe ser un número válido.');
    }

    return this.productsService.update(numericId, { id: numericId, categoryId });
  }
}
