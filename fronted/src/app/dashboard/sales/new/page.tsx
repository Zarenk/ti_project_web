import { getCategories } from '../../categories/categories.api';
import { SaleTabs } from './sale-tabs';

export default async function SalesNewPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10">
      <SaleTabs categories={categories} />
    </div>
  );
}
