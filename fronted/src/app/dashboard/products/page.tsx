import { getProducts } from '../products/products.api'
import { DataTable } from './data-table';
import { columns } from './columns';



export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA



export default async function Page() {

  //consulta al API
  const products = await getProducts()
  //console.log(products)

  //para el label chiquito de la categoria
  const mappedData = products.map((product:any) => ({
    ...product,
    category_name: product.category?.name || "Sin categoría", // Agrega category_name a los datos
  }));

  return (
    <>
      <section className='py-2 sm:py-6'>
        <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
          <h1 className='px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6'>Productos</h1>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={mappedData}></DataTable>
          </div>          
        </div>
      </section>
    </>
  )
}


