import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

const DELIVERY_ALIASES = ['DELIVERY', 'ENVIO A DOMICILIO'];

function normalizeValue(value?: string | null) {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function shouldRequireCarrier(dto: CompleteOrderDto) {
  const normalized = normalizeValue(dto?.shippingMethod);
  if (!normalized) return false;
  return DELIVERY_ALIASES.some((alias) => alias === normalized);
}

export class CompleteOrderDto {
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  carrierId?: string;

  @ValidateIf(shouldRequireCarrier)
  @IsString()
  @IsNotEmpty()
  carrierName?: string;

  @ValidateIf(shouldRequireCarrier)
  @IsString()
  @IsNotEmpty()
  @IsIn(['HOME_DELIVERY', 'DELIVERY', 'AGENCY_PICKUP', 'PICKUP'])
  carrierMode?: string;
}

export const normalizeShippingMethod = normalizeValue;

export function normalizeCarrierMode(value?: string | null) {
  const normalized = normalizeValue(value);
  if (['DELIVERY', 'HOME_DELIVERY'].includes(normalized)) {
    return 'HOME_DELIVERY';
  }
  if (['PICKUP', 'AGENCY_PICKUP', 'AGENCY'].includes(normalized)) {
    return 'AGENCY_PICKUP';
  }
  return normalized || undefined;
}

export function isDeliveryShipping(value?: string | null) {
  const normalized = normalizeValue(value);
  return DELIVERY_ALIASES.includes(normalized);
}
