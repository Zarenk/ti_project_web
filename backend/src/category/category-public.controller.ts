import { Controller, Get, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('public/category')
@UseGuards(TenantRequiredGuard)
export class CategoryPublicController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('with-count')
  findAllWithCount() {
    return this.categoryService.findAllWithProductCount();
  }
}
