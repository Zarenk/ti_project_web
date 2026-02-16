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

export type CompanyDocumentSequenceSnapshot = {
  id: number;
  documentType: string;
  serie: string;
  nextCorrelative: number;
  correlativeLength: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CompanySnapshot = {
  id: number;
  organizationId: number;
  name: string;
  businessVertical?: string | null;
  legalName: string | null;
  taxId: string | null;
  status: string;
  defaultQuoteMargin?: number | null;
  sunatEnvironment: string;
  sunatRuc: string | null;
  sunatBusinessName: string | null;
  sunatAddress: string | null;
  sunatPhone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
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
  documentSequences: CompanyDocumentSequenceSnapshot[];
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
