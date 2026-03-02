import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EntriesForm from './entries.form'
import { getCategories } from '../../categories/categories.api'
import { getEntryById } from '../entries.api'
import { EntryTabs } from './entry-tabs'
import { EntryFormGuideButton } from './entry-form-guide-button'

interface Props {
    params: Promise<{ id?: string }>;
}

export default async function EntriesNewPage({ params }: Props) {
  const resolvedParams = await params
  const entry = resolvedParams.id ? await getEntryById(resolvedParams.id) : null
  const categories = await getCategories()

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10">
      {resolvedParams.id ? (
        <Card className="mx-auto w-full max-w-6xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-center gap-2 pt-5">
              <CardTitle className="text-center text-xl font-bold">
                Editar Registro Existente
              </CardTitle>
              <EntryFormGuideButton />
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <EntriesForm entries={entry} categories={categories} />
          </CardContent>
        </Card>
      ) : (
        <EntryTabs categories={categories} />
      )}
    </div>
  )
}
