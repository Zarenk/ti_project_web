import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

export class UpdateAutoReplyConfigDto {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  greetingMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  fallbackMessage?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  maxRepliesPerContactPerDay?: number;

  @IsBoolean()
  @IsOptional()
  aiEnabled?: boolean;
}

export class CreateAutoReplyRuleDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  keywords!: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  answer!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  priority?: number = 0;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateAutoReplyRuleDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(4096)
  answer?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
