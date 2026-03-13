import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateMenuConfigDto {
  @IsObject()
  data!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}
