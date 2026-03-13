import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateComplaintDto {
  /** Company slug to identify the provider */
  @IsString()
  @IsNotEmpty()
  slug!: string;

  // ── Sección 1: Consumidor ────────────────────────────────────

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  consumerName!: string;

  @IsString()
  @IsIn(['DNI', 'CE'])
  consumerDocType!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(20)
  consumerDocNumber!: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  consumerAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  consumerPhone?: string;

  @IsEmail()
  @IsNotEmpty()
  consumerEmail!: string;

  @IsBoolean()
  @IsOptional()
  isMinor?: boolean;

  @ValidateIf((o) => o.isMinor === true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  parentName?: string;

  @ValidateIf((o) => o.isMinor === true)
  @IsString()
  @IsIn(['DNI', 'CE'])
  parentDocType?: string;

  @ValidateIf((o) => o.isMinor === true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  parentDocNumber?: string;

  // ── Sección 2: Bien contratado ───────────────────────────────

  @IsString()
  @IsIn(['PRODUCTO', 'SERVICIO'])
  goodType!: string;

  @IsNumber()
  @IsOptional()
  claimedAmount?: number;

  @IsString()
  @IsOptional()
  @IsIn(['PEN', 'USD'])
  amountCurrency?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  goodDescription!: string;

  // ── Sección 3: Detalle ───────────────────────────────────────

  @IsString()
  @IsIn(['RECLAMO', 'QUEJA'])
  complaintType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  detail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  consumerRequest!: string;

  // ── Firma virtual ────────────────────────────────────────────

  @IsBoolean()
  signatureConfirmed!: boolean;
}
