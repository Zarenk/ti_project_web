export interface TenantContext {
  organizationId: number | null;
  companyId: number | null;
  organizationUnitId: number | null;
  userId: number | null;
  isGlobalSuperAdmin: boolean;
  isOrganizationSuperAdmin: boolean;
  isSuperAdmin: boolean;
  allowedOrganizationIds: number[];
  allowedCompanyIds: number[];
  allowedOrganizationUnitIds: number[];
}
