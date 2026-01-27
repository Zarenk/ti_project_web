import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntryPaymentMethod, PaymentTerm } from '@prisma/client';

export class CreateEntryDto {
  @ApiPropertyOptional({
    enum: EntryPaymentMethod,
    default: EntryPaymentMethod.CASH,
  })
  paymentMethod?: EntryPaymentMethod;

  @ApiPropertyOptional({ enum: PaymentTerm, default: PaymentTerm.CASH })
  paymentTerm?: PaymentTerm;

  @ApiPropertyOptional()
  serie?: string;

  @ApiPropertyOptional()
  correlativo?: string;

  @ApiPropertyOptional()
  providerName?: string;

  @ApiPropertyOptional()
  totalGross?: number;

  @ApiPropertyOptional()
  igvRate?: number;

  @ApiPropertyOptional({ nullable: true })
  organizationId?: number | null;

  @ApiPropertyOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  guiaSerie?: string;

  @ApiPropertyOptional()
  guiaCorrelativo?: string;

  @ApiPropertyOptional()
  guiaFechaEmision?: string;

  @ApiPropertyOptional()
  guiaFechaEntregaTransportista?: string;

  @ApiPropertyOptional()
  guiaMotivoTraslado?: string;

  @ApiPropertyOptional()
  guiaPuntoPartida?: string;

  @ApiPropertyOptional()
  guiaPuntoLlegada?: string;

  @ApiPropertyOptional()
  guiaDestinatario?: string;

  @ApiPropertyOptional()
  guiaPesoBrutoUnidad?: string;

  @ApiPropertyOptional()
  guiaPesoBrutoTotal?: string;

  @ApiPropertyOptional()
  guiaTransportista?: string;
}
