import ProductForm from './product-form'
import { getProduct } from '../products.api'
import { getCategories } from '../../categories/categories.api';

interface Props {
    params: Promise<{ id?: string }>;
  }

export default async function ProductsNewPage({params}: Props) {
    const resolvedParams = await params;
    const product = resolvedParams.id ? await getProduct(resolvedParams.id) : null;
    const categories = await getCategories();

  return (
    <div className="min-h-screen">
      <ProductForm product={product} categories={categories} />
    </div>
  )
}
