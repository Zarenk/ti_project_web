import { PartialType } from '@nestjs/mapped-types';
import { CreateCreativeDto } from './create-creative.dto';

export class UpdateCreativeDto extends PartialType(CreateCreativeDto) {}
