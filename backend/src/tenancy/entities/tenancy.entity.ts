export type StoredOrganizationUnit = {
  id: number;
  organizationId: number;
  companyId: number | null;
  parentUnitId: number | null;
  name: string;
  code: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationSuperAdmin = {
  id: number;
  username: string;
  email: string;
};

export type CompanySnapshot = {
  id: number;
  organizationId: number;
  name: string;
  legalName: string | null;
  taxId: string | null;
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
  companies: CompanySnapshot[];
  membershipCount: number;
  superAdmin: OrganizationSuperAdmin | null;
};
