import {
    IsString,
    IsNotEmpty,
    IsObject,
    ValidateNested,
    IsArray,
    IsNumber,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  class TransportistaDto {
    @IsString()
    @IsNotEmpty()
    tipoDocumento!: string;
  
    @IsString()
    @IsNotEmpty()
    numeroDocumento!: string;
  
    @IsString()
    @IsNotEmpty()
    razonSocial!: string;
  
    @IsString()
    @IsNotEmpty()
    numeroPlaca?: string;
  }
  
  class DestinatarioDto {
    @IsString()
    @IsNotEmpty()
    tipoDocumento!: string;
  
    @IsString()
    @IsNotEmpty()
    numeroDocumento!: string;
  
    @IsString()
    @IsNotEmpty()
    razonSocial!: string;
  }
  
  class ItemDto {
    @IsString()
    @IsNotEmpty()
    codigo!: string;
  
    @IsString()
    @IsNotEmpty()
    descripcion!: string;
  
    @IsNumber()
    cantidad!: number;
  
    @IsString()
    @IsNotEmpty()
    unidadMedida!: string;
  }
  
  export class CreateGuideDto {
    @IsString()
    @IsNotEmpty()
    tipoDocumentoRemitente!: string;
  
    @IsString()
    @IsNotEmpty()
    numeroDocumentoRemitente!: string;
  
    @IsString()
    @IsNotEmpty()
    razonSocialRemitente!: string;
  
    @IsString()
    @IsNotEmpty()
    puntoPartida!: string;
  
    @IsString()
    @IsNotEmpty()
    puntoLlegada!: string;
  
    @IsString()
    @IsNotEmpty()
    motivoTraslado!: string;
  
    @IsString()
    @IsNotEmpty()
    fechaTraslado!: string;
  
    @IsObject()
    @ValidateNested()
    @Type(() => TransportistaDto)
    transportista!: TransportistaDto;
  
    @IsObject()
    @ValidateNested()
    @Type(() => DestinatarioDto)
    destinatario!: DestinatarioDto;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemDto)
    items!: ItemDto[];
  }