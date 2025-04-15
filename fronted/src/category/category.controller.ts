import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

    @Post()
    @ApiOperation({summary: 'Create a category'})    // Swagger 
    create(@Body() createCategoryDto: CreateCategoryDto) {
      return this.categoryService.create(createCategoryDto);
    }

    @Post('verify-or-create-default')
    async verifyOrCreateDefaultCategory() {
      return this.categoryService.verifyOrCreateDefaultCategory();
    }

    @Post('verify')
    async verifyCategories(@Body() categories: { name: string }[]) {
      return this.categoryService.verifyCategories(categories);
    }
  
    @Get()
    @ApiResponse({status: 200, description: 'Return all categories'}) // Swagger 
    findAll() {
      return this.categoryService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      const numericId = parseInt(id, 10); // Convierte el ID a un número entero
      if (isNaN(numericId)) {
      throw new BadRequestException('El ID debe ser un número válido.');
      }
      return this.categoryService.findOne(numericId);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
      return this.categoryService.update(+id, updateCategoryDto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.categoryService.remove(+id);
    }
  
    @Delete()
    async removes(@Body('ids') ids: number[]) {
      return this.categoryService.removes(ids);
    }
}
