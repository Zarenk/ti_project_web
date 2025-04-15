import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SalesForm from './sales-form';
import { getCategories } from '../../categories/categories.api';

export default async function SalesNewPage() {

    const categories = await getCategories();

  return (
    <div className="flex justify-center items-start min-h-screen p-3">
       
        <Card className="w-full max-w-lg sm:max-w-xl md:max-w-lg lg:max-w-4xl xl:max-w-6xl" >
            <CardHeader className="pb-2 sm:pb-2">
                {/* Renderizado del componente: Usamos resolvedParams.id para determinar si 
                stamos creando un producto nuevo o actualizando uno existente. 
                Esto se refleja en el título del formulario:*/}
                <CardTitle className="text-center text-xl font-bold pt-5">
                    Registrar nueva venta
                </CardTitle>
            </CardHeader>
            <CardContent className='w-full'>
                <SalesForm categories={categories}></SalesForm>
            </CardContent>
        </Card>


    </div>
  )
}
