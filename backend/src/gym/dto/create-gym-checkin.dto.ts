import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateGymCheckinDto {
  @IsInt()
  memberId!: number;

  @IsOptional()
  @IsInt()
  membershipId?: number;

  @IsOptional()
  @IsString()
  method?: string; // QR, MANUAL, BARCODE, NFC
}
