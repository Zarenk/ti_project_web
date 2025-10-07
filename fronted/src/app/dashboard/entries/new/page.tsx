import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EntriesForm from './entries.form'
import { getCategories } from '../../categories/categories.api';
import { getEntryById } from '../entries.api';

interface Props {
    params: Promise<{ id?: string }>;
}

export default async function EntriesNewPage({params}: Props) {
    const resolvedParams = await params;
    const entry = resolvedParams.id ? await getEntryById(resolvedParams.id) : null;
    const categories = await getCategories();

  return (
    // Contenedor principal para centrar el Card y darle algo de espacio
    <div className="flex justify-center items-start min-h-screen p-3 lg:p-6 bg-gray-50">
       
        <Card className="w-full 
                         max-w-screen-sm   // Por defecto (XS): ~640px. Permite un buen ancho en la mayoría de móviles.
                         sm:max-w-screen-md // SM: ~768px
                         md:max-w-screen-lg // MD: ~1024px. Aquí la tabla ya debería verse casi completa.
                         lg:max-w-screen-xl // LG: ~1280px. Toda la tabla visible.
                         xl:max-w-screen-2xl // XL: ~1536px. Para monitores muy grandes.
                         " >
            <CardHeader className="pb-2 sm:pb-2">
                <CardTitle className="text-center text-xl font-bold pt-5">
                    {resolvedParams.id ? "Editar Registro Existente" : "Ingresar nuevo registro"}
                </CardTitle>
            </CardHeader>
            <CardContent className='w-full'>
                <EntriesForm entries={entry} categories={categories}></EntriesForm>
            </CardContent>
        </Card>
    </div>
  )
}
