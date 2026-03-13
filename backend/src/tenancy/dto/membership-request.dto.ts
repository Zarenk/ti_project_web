import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMembershipRequestDto {
  @IsInt()
  @Type(() => Number)
  toOrganizationId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminAddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'MEMBER', 'VIEWER'])
  role?: string;
}

export class AdminMoveMemberDto {
  @IsInt()
  @Type(() => Number)
  targetUserId!: number;

  @IsInt()
  @Type(() => Number)
  fromOrganizationId!: number;

  @IsInt()
  @Type(() => Number)
  toOrganizationId!: number;

  @IsOptional()
  @IsEnum(['ADMIN', 'MEMBER', 'VIEWER'])
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ResolveMembershipRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNote?: string;
}
