import { KmsService } from './kms.service';

/**
 * Prisma 7.x extension that encrypts `credentialsRef` fields before persisting
 * them to the database.
 * Migrated from middleware ($use) to extensions ($extends) API.
 */
export function encryptCredentialsMiddleware(kms: KmsService) {
  return {
    name: 'encryptCredentials',
    query: {
      $allModels: {
        async $allOperations({ args, query, operation }: any) {
          // Encrypt credentialsRef on create and update operations
          if (
            ['create', 'update'].includes(operation) &&
            args?.data?.credentialsRef
          ) {
            args.data.credentialsRef = kms.encrypt(args.data.credentialsRef);
          }
          return query(args);
        },
      },
    },
  };
}
