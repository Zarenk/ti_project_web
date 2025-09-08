import { Keyword } from '@prisma/client';

export type CreateKeywordDto = Pick<Keyword, 'name' | 'brandId'>;
