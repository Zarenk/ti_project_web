import { IsArray, IsInt, IsIn } from 'class-validator';

export class PublishAdDto {
  @IsInt()
  adGenerationId!: number;

  @IsArray()
  @IsIn(['FACEBOOK', 'INSTAGRAM', 'TIKTOK'], { each: true })
  networks!: string[];
}
