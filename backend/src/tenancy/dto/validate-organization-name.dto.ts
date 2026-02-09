import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ValidateOrganizationNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
