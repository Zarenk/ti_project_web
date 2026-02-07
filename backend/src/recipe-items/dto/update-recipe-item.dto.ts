import { PartialType } from '@nestjs/swagger';
import { CreateRecipeItemDto } from './create-recipe-item.dto';

export class UpdateRecipeItemDto extends PartialType(CreateRecipeItemDto) {}
