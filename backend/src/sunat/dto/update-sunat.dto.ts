import { PartialType } from '@nestjs/swagger';
import { CreateSunatDto } from './create-sunat.dto';

export class UpdateSunatDto extends PartialType(CreateSunatDto) {}
