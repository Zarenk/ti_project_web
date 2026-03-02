import { IsInt, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateFromProductDto {
  @ApiProperty({ description: 'Product ID to generate ads for' })
  @IsInt()
  productId!: number;

  @ApiProperty({
    description: 'Tone for the ad copy',
    enum: ['profesional', 'casual', 'urgente', 'aspiracional'],
    required: false,
    default: 'profesional',
  })
  @IsOptional()
  @IsIn(['profesional', 'casual', 'urgente', 'aspiracional'])
  tone?: 'profesional' | 'casual' | 'urgente' | 'aspiracional';

  @ApiProperty({
    description: 'Visual style for generated images',
    enum: ['moderno', 'minimalista', 'vibrante', 'elegante'],
    required: false,
    default: 'moderno',
  })
  @IsOptional()
  @IsIn(['moderno', 'minimalista', 'vibrante', 'elegante'])
  style?: 'moderno' | 'minimalista' | 'vibrante' | 'elegante';
}
