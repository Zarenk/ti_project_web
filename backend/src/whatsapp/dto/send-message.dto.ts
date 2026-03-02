import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, ArrayMaxSize, ArrayMinSize, Matches, MaxLength } from 'class-validator';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  TEMPLATE = 'TEMPLATE',
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Numero de telefono invalido. Usa formato E.164 (ej: 51987654321)' })
  to!: string; // Phone number with country code (E.164)

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096, { message: 'El mensaje no puede exceder 4096 caracteres' })
  content!: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @IsString()
  @IsOptional()
  mediaUrl?: string; // For images/documents/audio

  @IsNumber()
  @IsOptional()
  clientId?: number;

  @IsNumber()
  @IsOptional()
  salesId?: number;

  @IsNumber()
  @IsOptional()
  invoiceId?: number;
}

export class SendTemplateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Numero de telefono invalido. Usa formato E.164 (ej: 51987654321)' })
  to!: string;

  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @IsOptional()
  variables?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  clientId?: number;

  @IsNumber()
  @IsOptional()
  salesId?: number;
}

export class BulkMessageDto {
  @IsString({ each: true })
  @Matches(/^\+?[1-9]\d{6,14}$/, { each: true, message: 'Numero de telefono invalido. Usa formato E.164 (ej: 51987654321)' })
  @ArrayMinSize(1)
  @ArrayMaxSize(50, { message: 'Maximo 50 destinatarios por envio para evitar bloqueos de WhatsApp' })
  recipients!: string[]; // Array of phone numbers — max 50 per request

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096, { message: 'El mensaje no puede exceder 4096 caracteres' })
  content!: string;

  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;
}
