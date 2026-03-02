"use client";

import { useQuery } from '@tanstack/react-query';
import { DataTable } from './data-table';
import { getAllEntries } from './entries.api';
import { EntriesListGuideButton } from './entries-list-guide-button';
import { useTenantSelection } from '@/context/tenant-selection-context';
import { queryKeys } from '@/lib/query-keys';
import { TablePageSkeleton } from '@/components/table-page-skeleton';
import { useMemo } from 'react';

export default function Page() {
  const { selection } = useTenantSelection();

  const { data: entryes = [], isLoading } = useQuery<any[]>({
    queryKey: queryKeys.entries.list(selection.orgId, selection.companyId),
    queryFn: () => getAllEntries(),
    enabled: selection.orgId !== null,
  });

  const mappedData = useMemo(
    () =>
      entryes.map((entry: any) => ({
        ...entry,
        id: entry.id,
        createdAt: new Date(entry.createdAt),
        provider_name: entry.provider?.name || "Sin proveedor",
        user_username: entry.user?.username || "Sin usuario",
        store_name: entry.store?.name || "Sin tienda",
        store_adress: entry.store?.adress || "Sin direccion",
        date: entry.date ? new Date(entry.date) : new Date(),
        description: entry.description || "Sin descripcion",
        tipoMoneda: entry.tipoMoneda || "Sin moneda",
        details: entry.details.map((detail: any) => ({
          product_name: detail.product?.name || "Sin nombre",
          quantity: detail.quantity || 0,
          price: detail.price || 0,
          series: detail.series || "Sin serie",
        })),
      })),
    [entryes],
  );

  return (
    <>
      <section className='py-2 sm:py-6'>
        <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
          <div className="flex items-center gap-2 px-5 mb-4 sm:mb-6">
            <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>Control de Inventarios: Ingresos</h1>
            <EntriesListGuideButton />
          </div>
          {isLoading ? (
            <TablePageSkeleton title={false} columns={5} rows={6} actions={false} />
          ) : (
            <div className="overflow-x-auto">
              <DataTable data={mappedData}></DataTable>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
