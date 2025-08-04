import { PartialType } from '@nestjs/swagger';
import { CreateCatalogexportDto } from './create-catalogexport.dto';

export class UpdateCatalogexportDto extends PartialType(CreateCatalogexportDto) {}
