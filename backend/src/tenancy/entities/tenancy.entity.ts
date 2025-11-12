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
  sunatEnvironment: string;
  sunatRuc: string | null;
  sunatSolUserBeta: string | null;
  sunatSolPasswordBeta: string | null;
  sunatCertPathBeta: string | null;
  sunatKeyPathBeta: string | null;
  sunatSolUserProd: string | null;
  sunatSolPasswordProd: string | null;
  sunatCertPathProd: string | null;
  sunatKeyPathProd: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TenancySnapshot = {
  id: number;
  name: string;
  slug: string | null;
  code: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  units: StoredOrganizationUnit[];
  companies: CompanySnapshot[];
  membershipCount: number;
  superAdmin: OrganizationSuperAdmin | null;
};
