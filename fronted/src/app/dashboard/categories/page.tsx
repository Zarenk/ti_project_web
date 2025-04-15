
import { getCategories } from './categories.api';
import { columns } from './columns';
import { DataTable } from './data-table';



export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA



async function Page() {

  const categories = await getCategories()
  //console.log(products)

  return (
    <>
      <section className='py-2 sm:py-6'>
        <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
          <h1 className='px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6'>Categorias</h1>
          <DataTable columns={columns} data={categories}></DataTable>
        </div>
      </section>
    </>
  )
}

export default Page