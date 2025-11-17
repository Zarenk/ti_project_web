-- Add new roles to the UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN_GLOBAL';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN_ORG';

-- Add new role to the OrganizationMembershipRole enum
ALTER TYPE "OrganizationMembershipRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
