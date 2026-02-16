import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessVertical } from 'src/types/business-vertical.enum';

export class UpdateBusinessVerticalDto {
  @IsEnum(BusinessVertical)
  vertical!: BusinessVertical;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
