export interface TenantContext {
  organizationId: number | null;
  organizationUnitId: number | null;
  userId: number | null;
  isGlobalSuperAdmin: boolean;
  isOrganizationSuperAdmin: boolean;
  isSuperAdmin: boolean;
  allowedOrganizationIds: number[];
  allowedOrganizationUnitIds: number[];
}
