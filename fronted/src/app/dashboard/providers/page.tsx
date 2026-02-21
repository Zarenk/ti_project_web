import Link from 'next/link';
import { columns } from './columns';
import { DataTable } from './data-table';
import { getProviders } from './providers.api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Plus } from 'lucide-react';
import { ProvidersGuideButton } from './providers-guide-button';



export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA



export default async function Page() {

  //consulta al API
  const providers = await getProviders()
  //console.log(stores)

  //para el label chiquito de la categoria
  const mappedData = providers.map((provider:any) => ({
    ...provider,
  }));

  return (
    <>
      <section className='py-2 sm:py-6'>
        <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
          <div className="flex items-center justify-between gap-3 px-5 mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Proveedores</h1>
              <ProvidersGuideButton />
            </div>

            {/* ── Mobile: compact icon row ─────────────────── */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <Button
                asChild
                size="icon"
                className="h-8 w-8 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:scale-95 dark:border-emerald-400/30"
                title="Nuevo proveedor"
              >
                <Link href="/dashboard/providers/new">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="icon" variant="outline" className="h-8 w-8" title="Importar Excel">
                <Link href="/dashboard/providers/excel-upload">
                  <FileSpreadsheet className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* ── Desktop: full controls ────────────────────── */}
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                asChild
                className="gap-2 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] dark:border-emerald-400/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Link href="/dashboard/providers/excel-upload">
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar Excel
                </Link>
              </Button>
              <Button
                asChild
                className="gap-2 border-emerald-500/50 bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500 hover:shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] dark:border-emerald-400/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                <Link href="/dashboard/providers/new">
                  <Plus className="h-4 w-4" />
                  Nuevo proveedor
                </Link>
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={mappedData}></DataTable>
          </div>          
        </div>
      </section>
    </>
  )
}
