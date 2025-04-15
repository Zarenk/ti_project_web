import { columns } from './columns';
import { DataTable } from './data-table';
import { getStores } from './stores.api';



export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA



export default async function Page() {

  //consulta al API
  const stores = await getStores()
  //console.log(stores)

  //para el label chiquito de la categoria
  const mappedData = stores.map((store:any) => ({
    ...store,
  }));

  return (
    <>
      <section className='py-2 sm:py-6'>
        <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
          <h1 className='px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6'>Tiendas</h1>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={mappedData}></DataTable>
          </div>          
        </div>
      </section>
    </>
  )
}
