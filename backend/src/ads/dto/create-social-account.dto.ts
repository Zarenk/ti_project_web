import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateSocialAccountDto {
  @IsIn(['FACEBOOK', 'INSTAGRAM', 'TIKTOK'])
  platform!: string;

  @IsString()
  accountName!: string;

  @IsString()
  accountId!: string;

  @IsString()
  accessToken!: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;
}
