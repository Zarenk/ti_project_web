"use client";

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { columns } from './columns';
import { DataTable } from './data-table';
import { getStores } from './stores.api';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { StoresGuideButton } from './stores-guide-button';
import { useTenantSelection } from '@/context/tenant-selection-context';
import { queryKeys } from '@/lib/query-keys';
import { TablePageSkeleton } from '@/components/table-page-skeleton';

export default function Page() {
  const { selection } = useTenantSelection();

  const { data: stores = [], isLoading } = useQuery<any[]>({
    queryKey: queryKeys.stores.list(selection.orgId, selection.companyId),
    queryFn: () => getStores(),
    enabled: selection.orgId !== null,
  });

  const mappedData = stores.map((store: any) => ({
    ...store,
  }));

  return (
    <>
      <section className='py-2 sm:py-6'>
        <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
          <div className="flex items-center justify-between gap-3 px-5 mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Tiendas</h1>
              <StoresGuideButton />
            </div>

            {/* ── Mobile: green icon only ─────────────────── */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <Button
                asChild
                size="icon"
                className="h-8 w-8 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:scale-95 dark:border-emerald-400/30"
                title="Nueva tienda"
              >
                <Link href="/dashboard/stores/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* ── Desktop: full button ────────────────────── */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                asChild
                className="gap-2 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] dark:border-emerald-400/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Link href="/dashboard/stores/new">
                  <Plus className="h-4 w-4" />
                  Nueva tienda
                </Link>
              </Button>
            </div>
          </div>
          {isLoading ? (
            <TablePageSkeleton title={false} columns={5} rows={6} actions={false} />
          ) : (
            <div className="overflow-x-auto">
              <DataTable columns={columns} data={mappedData} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
