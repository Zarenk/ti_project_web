import { Expose } from 'class-transformer';

export class CreateSiteSettingDto {
  @Expose()
  settings!: Record<string, unknown>;

  @Expose()
  updatedAt!: string;

  @Expose()
  createdAt!: string;
}
