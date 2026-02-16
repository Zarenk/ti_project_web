import Link from 'next/link';
import { columns } from './columns';
import { DataTable } from './data-table';
import { getProviders } from './providers.api';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';



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
          <div className="flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>Proveedores</h1>
            <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
              <Link href="/dashboard/providers/excel-upload">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Subir proveedores desde Excel
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={mappedData}></DataTable>
          </div>          
        </div>
      </section>
    </>
  )
}
