export type LookupType = 'RUC' | 'DNI';

export type LookupSource = 'apis.net.pe' | 'apisperu.com';

export interface LookupResultDto {
  type: LookupType;
  identifier: string;
  name: string;
  address: string | null;
  status: string | null;
  condition: string | null;
  ubigeo: string | null;
  source: LookupSource;
  cached: boolean;
  refreshedAt: string;
  raw: Record<string, unknown>;
}
