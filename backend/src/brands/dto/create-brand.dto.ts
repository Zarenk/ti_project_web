import { Brand } from "../entities/brand.entity";

export type CreateBrandDto = Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>;