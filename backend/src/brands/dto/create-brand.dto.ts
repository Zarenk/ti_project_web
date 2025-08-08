import { Brand } from '@prisma/client';

export type CreateBrandDto = Pick<Brand, 'name'> &
  Partial<Pick<Brand, 'logoSvg' | 'logoPng'>>;