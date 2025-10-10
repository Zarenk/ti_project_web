import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getEntryById } from './entries.api';
import { getCategories } from '../categories/categories.api';
import EntriesForm from './new/entries.form';


interface Props {
    params: Promise<{ id?: string }>;
}

export default async function EntriesNewPage({params}: Props) {
    const resolvedParams = await params;
    const entry = resolvedParams.id ? await getEntryById(resolvedParams.id) : null;
    const categories = await getCategories();

  return (
    <div className="flex justify-center items-start min-h-screen p-3">
       
        <Card className="w-full 
                         max-w-2xl       // Ancho por defecto (XS a SM), ~768px
                         sm:max-w-3xl   // Ancho para SM, ~896px
                         md:max-w-4xl   // Ancho para MD, ~1024px
                         lg:max-w-5xl   // Ancho para LG, ~1152px
                         xl:max-w-6xl   // Ancho para XL, ~1280px
                         2xl:max-w-7xl  // Ancho para 2XL, ~1536px (Opcional, si tienes pantallas muy grandes)
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