-- Add new super admin roles to UserRole enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'SUPER_ADMIN_GLOBAL'
      AND enumtypid = 'UserRole'::regtype
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN_GLOBAL';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'SUPER_ADMIN_ORG'
      AND enumtypid = 'UserRole'::regtype
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN_ORG';
  END IF;
END$$;

-- Add organization-level super admin membership role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'SUPER_ADMIN'
      AND enumtypid = 'OrganizationMembershipRole'::regtype
  ) THEN
    ALTER TYPE "OrganizationMembershipRole" ADD VALUE 'SUPER_ADMIN';
  END IF;
END$$;
