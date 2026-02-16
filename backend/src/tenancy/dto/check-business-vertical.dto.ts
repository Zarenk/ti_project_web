import { IsEnum } from 'class-validator';
import { BusinessVertical } from 'src/types/business-vertical.enum';

export class CheckBusinessVerticalDto {
  @IsEnum(BusinessVertical)
  targetVertical!: BusinessVertical;
}
