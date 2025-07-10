import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';


@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({summary: 'Create a product'})    // Swagger 
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('verify-or-create-products')
  async verifyOrCreateProducts(
    @Body() products: { name: string; price: number; description?: string; brand?: string; categoryId?: number }[],
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
    uploadImage(@UploadedFile() file: Express.Multer.File) {
      if (!file) {
        throw new BadRequestException('No se proporcionó ninguna imagen');
      }
      return { url: `/uploads/products/${file.filename}` };
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
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
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
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
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
