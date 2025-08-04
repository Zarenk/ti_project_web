import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CatalogexportService } from './catalogexport.service';
import { CreateCatalogexportDto } from './dto/create-catalogexport.dto';
import { UpdateCatalogexportDto } from './dto/update-catalogexport.dto';

@Controller('catalogexport')
export class CatalogexportController {
  constructor(private readonly catalogexportService: CatalogexportService) {}

  @Post()
  create(@Body() createCatalogexportDto: CreateCatalogexportDto) {
    return this.catalogexportService.create(createCatalogexportDto);
  }

  @Get()
  findAll() {
    return this.catalogexportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.catalogexportService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCatalogexportDto: UpdateCatalogexportDto) {
    return this.catalogexportService.update(+id, updateCatalogexportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.catalogexportService.remove(+id);
  }
}
