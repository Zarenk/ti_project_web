import { Injectable } from '@nestjs/common';
import { CreateCatalogexportDto } from './dto/create-catalogexport.dto';
import { UpdateCatalogexportDto } from './dto/update-catalogexport.dto';

@Injectable()
export class CatalogexportService {
  create(createCatalogexportDto: CreateCatalogexportDto) {
    return 'This action adds a new catalogexport';
  }

  findAll() {
    return `This action returns all catalogexport`;
  }

  findOne(id: number) {
    return `This action returns a #${id} catalogexport`;
  }

  update(id: number, updateCatalogexportDto: UpdateCatalogexportDto) {
    return `This action updates a #${id} catalogexport`;
  }

  remove(id: number) {
    return `This action removes a #${id} catalogexport`;
  }
}
