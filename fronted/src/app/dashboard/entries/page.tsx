import { getProducts } from '../products/products.api'
import { DataTable } from './data-table';
import { getAllEntries } from './entries.api';
import { EntriesListGuideButton } from './entries-list-guide-button';

export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA

export default async function Page() {

  //consulta al API
  const entryes = await getAllEntries()
  //console.log(products)

  //para el label chiquito de la categoria
  const mappedData = entryes.map((entry:any) => ({
    ...entry,
    id: entry.id,
    createdAt: new Date(entry.createdAt),
    provider_name: entry.provider?.name || "Sin proveedor",
    user_username: entry.user?.username || "Sin usuario",
    store_name: entry.store?.name   || "Sin tienda",
    store_adress: entry.store?.adress || "Sin direccion",
    date: entry.date ? new Date(entry.date) : new Date(), // Asegúrate de que la fecha esté en el formato correcto
    description: entry.description || "Sin descripcion",
    tipoMoneda: entry.tipoMoneda || "Sin moneda",
    details: entry.details.map((detail: any) => ({
        product_name: detail.product?.name || "Sin nombre",
        quantity: detail.quantity || 0,
        price: detail.price || 0,
        series: detail.series || "Sin serie",
    })) , // Asegúrate de incluir los detalles
  }));

  return (
    <>
      <section className='py-2 sm:py-6'>
        <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
          <div className="flex items-center gap-2 px-5 mb-4 sm:mb-6">
            <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold'>Control de Inventarios: Ingresos</h1>
            <EntriesListGuideButton />
          </div>
          <div className="overflow-x-auto">
            <DataTable data={mappedData}></DataTable>
          </div>
        </div>
      </section>
    </>
  )
}
