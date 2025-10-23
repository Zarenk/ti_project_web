import { Prisma } from '@prisma/client';
import { KmsService } from './kms.service';

/**
 * Prisma middleware that encrypts `credentialsRef` fields before persisting
 * them to the database.
 */
export function encryptCredentialsMiddleware(
  kms: KmsService,
): Prisma.Middleware {
  return async (params, next) => {
    const { args, action } = params as any;
    if (['create', 'update'].includes(action) && args?.data?.credentialsRef) {
      args.data.credentialsRef = kms.encrypt(args.data.credentialsRef);
    }
    return next(params);
  };
}
