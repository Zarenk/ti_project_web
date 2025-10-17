declare module '@prisma/client' {
  class PrismaClient {
    constructor(...args: any[]);
    $disconnect(): Promise<void>;
    [key: string]: any;
  }

  const UserRole: {
    ADMIN: 'ADMIN';
    CLIENT: 'CLIENT';
    SELLER: 'SELLER';
    SUPER_ADMIN: 'SUPER_ADMIN';
    CASHIER: 'CASHIER';
  };

  type UserRole = (typeof UserRole)[keyof typeof UserRole];

  const OrganizationMembershipRole: {
    OWNER: 'OWNER';
    ADMIN: 'ADMIN';
    MEMBER: 'MEMBER';
    VIEWER: 'VIEWER';
  };

  type OrganizationMembershipRole =
    (typeof OrganizationMembershipRole)[keyof typeof OrganizationMembershipRole];
}