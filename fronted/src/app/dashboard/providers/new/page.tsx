import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ProviderForm from './provider-form'
import { getProvider } from '../providers.api'
import { ProviderFormGuideButton } from './provider-form-guide-button'

interface Props {

    //Definimos params como una promesa: En la interfaz Props, indicamos que params 
    // es de tipo Promise<{ id?: string }>:
    params: Promise<{ id?: string }>; // params es ahora una promesa
  }

export default async function ProviderNewPage({params}: Props) {

    //Resolución de la promesa params: Dentro del componente, usamos 
    // await params para resolver la promesa y obtener el objeto real de params:
    const resolvedParams = await params; // Resolver la promesa de params

    //Acceso seguro a params.id: Una vez que la promesa está resuelta, verificamos si 
    // resolvedParams.id existe. Si existe, llamamos a la función getProvider para 
    // obtener los datos del proveedor:
    const provider = resolvedParams.id ? await getProvider(resolvedParams.id) : null;


  return (
    <div className="flex justify-center items-start min-h-screen p-3">
       
        <Card className="w-full max-w-lg sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl" >
            <CardHeader className="pb-2 sm:pb-2">
                {/* Renderizado del componente: Usamos resolvedParams.id para determinar si 
                stamos creando un producto nuevo o actualizando uno existente. 
                Esto se refleja en el título del formulario:*/}
                <CardTitle className="flex items-center justify-center gap-2 text-xl font-bold pt-5">
                    {resolvedParams.id ? 'Actualizar Proveedor' : 'Crear Proveedor'}
                    <ProviderFormGuideButton />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ProviderForm provider={provider}></ProviderForm>
            </CardContent>
        </Card>


    </div>
  )
}
