import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EntriesForm from './entries.form'
import { getCategories } from '../../categories/categories.api'
import { getEntryById } from '../entries.api'

interface Props {
    params: Promise<{ id?: string }>;
}

export default async function EntriesNewPage({ params }: Props) {
  const resolvedParams = await params
  const entry = resolvedParams.id ? await getEntryById(resolvedParams.id) : null
  const categories = await getCategories()

  return (
    <div className="min-h-screen w-ful px-4 py-6 sm:px-6 lg:px-10">
      <Card className="mx-auto w-full max-w-6xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="pt-5 text-center text-xl font-bold">
            {resolvedParams.id ? 'Editar Registro Existente' : 'Ingresar nuevo registro'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <EntriesForm entries={entry} categories={categories} />
        </CardContent>
      </Card>
    </div>
  )
}
