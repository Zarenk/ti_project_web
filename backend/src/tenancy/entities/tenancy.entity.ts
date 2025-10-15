export type StoredOrganizationUnit = {
  id: number;
  organizationId: number;
  parentUnitId: number | null;
  name: string;
  code: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TenancySnapshot = {
  id: number;
  name: string;
  code: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  units: StoredOrganizationUnit[];
  membershipCount: number;
};
