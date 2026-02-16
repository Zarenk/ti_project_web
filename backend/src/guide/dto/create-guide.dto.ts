import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsArray,
  IsNumber,
  IsOptional,
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
  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  correlativo?: string;

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

  @IsOptional()
  @IsString()
  motivoTrasladoCodigo?: string;

  @IsOptional()
  @IsString()
  fechaEmision?: string;

  @IsString()
  @IsNotEmpty()
  fechaTraslado!: string;

  @IsOptional()
  @IsString()
  modalidadTraslado?: string;

  @IsOptional()
  @IsString()
  puntoPartidaDireccion?: string;

  @IsOptional()
  @IsString()
  puntoPartidaUbigeo?: string;

  @IsOptional()
  @IsString()
  puntoPartidaDepartamento?: string;

  @IsOptional()
  @IsString()
  puntoPartidaProvincia?: string;

  @IsOptional()
  @IsString()
  puntoPartidaDistrito?: string;

  @IsOptional()
  @IsString()
  puntoPartidaUrbanizacion?: string;

  @IsOptional()
  @IsString()
  puntoPartidaPaisCodigo?: string;

  @IsOptional()
  @IsString()
  puntoLlegadaDireccion?: string;

  @IsOptional()
  @IsString()
  puntoLlegadaUbigeo?: string;

  @IsOptional()
  @IsString()
  puntoLlegadaDepartamento?: string;

  @IsOptional()
  @IsString()
  puntoLlegadaProvincia?: string;

  @IsOptional()
  @IsString()
  puntoLlegadaDistrito?: string;

  @IsOptional()
  @IsString()
  puntoLlegadaUrbanizacion?: string;

  @IsOptional()
  @IsString()
  puntoLlegadaPaisCodigo?: string;

  @IsOptional()
  @IsString()
  pesoBrutoUnidad?: string;

  @IsOptional()
  @IsNumber()
  pesoBrutoTotal?: number;

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
