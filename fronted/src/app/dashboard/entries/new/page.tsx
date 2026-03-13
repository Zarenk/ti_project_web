import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import EntriesForm from './entries.form'
import { getCategories } from '../../categories/categories.api'
import { getEntryById } from '../entries.api'
import { EntryTabs } from './entry-tabs'
import { EntryFormGuideButton } from './entry-form-guide-button'

interface Props {
    params: Promise<{ id?: string }>;
    searchParams: Promise<{ draftId?: string }>;
}

export default async function EntriesNewPage({ params, searchParams }: Props) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const editId = resolvedParams.id || resolvedSearchParams.draftId
  const entry = editId ? await getEntryById(editId) : null
  const isDraftEdit = !!resolvedSearchParams.draftId && entry?.status === 'DRAFT'
  const categories = await getCategories()

  return (
    <div className="min-h-screen w-full min-w-0 overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      {editId ? (
        <Card className="mx-auto w-full min-w-0 max-w-6xl overflow-hidden shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-center gap-2 pt-5">
              <CardTitle className="text-center text-xl font-bold">
                {isDraftEdit ? 'Editar Borrador' : 'Editar Registro Existente'}
              </CardTitle>
              <EntryFormGuideButton />
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <EntriesForm entries={entry} categories={categories} isDraftEdit={isDraftEdit} />
          </CardContent>
        </Card>
      ) : (
        <EntryTabs categories={categories} />
      )}
    </div>
  )
}
