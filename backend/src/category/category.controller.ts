import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ValidateCategoryNameDto } from './dto/validate-category-name.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@ModulePermission(['inventory', 'catalog', 'sales'])
@Controller('category')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ModulePermission(['inventory', 'catalog'])
  @Post()
  @ApiOperation({ summary: 'Create a category' }) // Swagger
  create(@Body() createCategoryDto: CreateCategoryDto, @Req() req: Request) {
    return this.categoryService.create(createCategoryDto, req);
  }

  @ModulePermission(['inventory', 'catalog'])
  @Post('verify-or-create-default')
  async verifyOrCreateDefaultCategory() {
    return this.categoryService.verifyOrCreateDefaultCategory();
  }

  @ModulePermission(['inventory', 'catalog'])
  @Post('verify')
  async verifyCategories(@Body() categories: { name: string }[]) {
    return this.categoryService.verifyCategories(categories);
  }

  @ModulePermission(['inventory', 'catalog'])
  @Post('validate-name')
  async validateCategoryName(
    @Body() dto: ValidateCategoryNameDto,
  ): Promise<{ nameAvailable: boolean }> {
    return this.categoryService.validateCategoryName(dto.name, dto.categoryId);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Return all categories' }) // Swagger
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('with-count')
  findAllWithCount() {
    return this.categoryService.findAllWithProductCount();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10); // Convierte el ID a un número entero
    if (isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un número válido.');
    }
    return this.categoryService.findOne(numericId);
  }

  @ModulePermission(['inventory', 'catalog'])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req: Request,
  ) {
    return this.categoryService.update(+id, updateCategoryDto, req);
  }

  @ModulePermission(['inventory', 'catalog'])
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.categoryService.remove(+id, req);
  }

  @ModulePermission(['inventory', 'catalog'])
  @Delete()
  async removes(@Body('ids') ids: number[], @Req() req: Request) {
    return this.categoryService.removes(ids, req);
  }
}
