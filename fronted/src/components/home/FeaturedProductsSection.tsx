import ScrollUpSection from '@/components/ScrollUpSection';
import MotionProductCard from '@/components/MotionProductCard';

interface FeaturedProductsSectionProps {
  featuredProducts: any[];
}

export default function FeaturedProductsSection({ featuredProducts }: FeaturedProductsSectionProps) {
  return (
    <ScrollUpSection className="py-12 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Productos destacados</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Descubre nuestra selección de equipos más populares con las mejores ofertas
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {featuredProducts.map((product, index) => (
            <MotionProductCard
              key={product.id}
              product={product}
              withActions
            />
          ))}
        </div>
      </div>
    </ScrollUpSection>
  );
}
