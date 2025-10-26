import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import {
  CompanyInputDto,
  CreateTenancyDto,
  CompanyInputDto,
  OrganizationUnitInputDto,
} from './create-tenancy.dto';

export class UpdateTenancyDto extends PartialType(CreateTenancyDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationUnitInputDto)
  declare units?: OrganizationUnitInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyInputDto)
  declare companies?: CompanyInputDto[];
}
