export interface TenantContext {
  organizationId: number | null;
  organizationUnitId: number | null;
  userId: number | null;
  isSuperAdmin: boolean;
  allowedOrganizationIds: number[];
  allowedOrganizationUnitIds: number[];
}
