'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import type { CompanyVerticalInfo } from './tenancy.api';
import { fetchCompanyVerticalInfo } from './tenancy.api';
import { VerticalManagementPanel } from './vertical-management-panel';
import { VerticalStatusIndicator } from './vertical-status-indicator';
import { SchemaEnforcementToggle } from './schema-enforcement-toggle';

interface CompanyOption {
  id: number;
  name: string;
}

interface OrganizationVerticalCardProps {
  organizationId: number;
  companies: CompanyOption[];
  initialInfo: CompanyVerticalInfo | null;
  canManage: boolean;
}

export function OrganizationVerticalCard({
  organizationId,
  companies,
  initialInfo,
  canManage,
}: OrganizationVerticalCardProps) {
  const firstCompanyId = initialInfo?.companyId ?? companies[0]?.id ?? null;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(firstCompanyId);
  const [info, setInfo] = useState<CompanyVerticalInfo | null>(initialInfo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => companies ?? [], [companies]);

  const loadInfo = useCallback(
    async (companyId: number | null) => {
      if (!companyId) {
        setInfo(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCompanyVerticalInfo(companyId);
        setInfo(result);
      } catch (err: any) {
        setError(err?.message ?? 'No se pudo obtener la informacion del vertical.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedCompanyId) {
      setInfo(null);
      return;
    }
    if (initialInfo && initialInfo.companyId === selectedCompanyId) {
      setInfo(initialInfo);
      return;
    }
    void loadInfo(selectedCompanyId);
  }, [selectedCompanyId, initialInfo, loadInfo]);

  if (!options.length) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Esta organizacion no tiene empresas registradas.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-100 p-3 text-xs dark:border-slate-700">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Empresa asociada
        </p>
        <Select
          value={selectedCompanyId ? String(selectedCompanyId) : undefined}
          onValueChange={(value) => setSelectedCompanyId(Number(value))}
          disabled={loading}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Selecciona una empresa" />
          </SelectTrigger>
          <SelectContent className="min-w-full">
            {options.map((company) => (
              <SelectItem key={company.id} value={String(company.id)}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedCompanyId && info && (
        <>
          {canManage ? (
            <>
              <VerticalManagementPanel
                organizationId={organizationId}
                companyId={selectedCompanyId}
                info={info}
                disabled={loading}
              />
              <Separator className="my-3" />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado de migracion
                </p>
                <VerticalStatusIndicator info={info} />
              </div>
              <Separator className="my-3" />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Esquema de productos
                </p>
                <SchemaEnforcementToggle
                  companyId={selectedCompanyId}
                  initialEnforced={info.productSchemaEnforced}
                />
              </div>
            </>
          ) : (
            <VerticalStatusIndicator info={info} />
          )}
        </>
      )}
    </div>
  );
}
