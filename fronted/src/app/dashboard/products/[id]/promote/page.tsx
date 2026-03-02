import { getProduct } from '../../products.api'
import { PromoteClient } from './promote-client'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PromotePage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <PromoteClient product={product} />
      </div>
    </div>
  )
}
