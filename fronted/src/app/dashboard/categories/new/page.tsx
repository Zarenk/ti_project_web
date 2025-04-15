import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategory } from '../categories.api';
import { CategoryForm } from './category-form';

interface Props {

    //Definimos params como una promesa: En la interfaz Props, indicamos que params 
    // es de tipo Promise<{ id?: string }>:
    params: Promise<{ id?: string }>; // params es ahora una promesa
  }

export default async function CategoriesNewPage({params}: Props) {

    //Resolución de la promesa params: Dentro del componente, usamos 
    // await params para resolver la promesa y obtener el objeto real de params:
    const resolvedParams = await params; // Resolver la promesa de params

    //Acceso seguro a params.id: Una vez que la promesa está resuelta, verificamos si 
    // resolvedParams.id existe. Si existe, llamamos a la función getProduct para 
    // obtener los datos del producto:
    const category = resolvedParams.id ? await getCategory(resolvedParams.id) : null;

  return (
    <div className='flex justify-center items-start min-h-screen p-3'>
       
       <Card className="w-full max-w-lg sm:max-w-md md:max-w-lg lg:max-w-2xl" >
            <CardHeader className="pb-2 sm:pb-2">
                {/* Renderizado del componente: Usamos resolvedParams.id para determinar si 
                stamos creando un producto nuevo o actualizando uno existente. 
                Esto se refleja en el título del formulario:*/}
                <CardTitle className="text-center text-xl font-bold pt-5">
                    {resolvedParams.id ? 'Actualizar Categoria' : 'Crear Categoria'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <CategoryForm product={category}></CategoryForm>
            </CardContent>
        </Card>


    </div>
  )
}
