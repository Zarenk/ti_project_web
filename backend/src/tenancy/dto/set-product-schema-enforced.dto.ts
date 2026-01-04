import { IsBoolean } from 'class-validator';

export class SetProductSchemaEnforcedDto {
  @IsBoolean()
  enforced!: boolean;
}
