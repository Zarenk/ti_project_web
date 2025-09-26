import ScrollUpSection from '@/components/ScrollUpSection';
import MotionProductCard from '@/components/MotionProductCard';
import HorizontalScroller from '@/components/HorizontalScroller';

interface FeaturedProductsSectionProps {
  featuredProducts: any[];
  onEditProduct?: (productId: number) => void;
}

export default function FeaturedProductsSection({ featuredProducts, onEditProduct }: FeaturedProductsSectionProps) {
  return (
    <ScrollUpSection className="py-12 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            <span className="blue-scan-underline">Productos destacados</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Descubre nuestra selección de equipos más populares con las mejores ofertas
          </p>
        </div>
        {/* Mobile: horizontal scroller with chevrons */}
        <div className="md:hidden">
          <HorizontalScroller>
            {featuredProducts.map((product) => (
              <MotionProductCard
                key={product.id}
                product={product}
                withActions
                onEditProduct={onEditProduct}
              />
            ))}
          </HorizontalScroller>
        </div>

        {/* Desktop/tablet: grid layout */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-8">
          {featuredProducts.map((product) => (
            <MotionProductCard
              key={product.id}
              product={product}
              withActions
              onEditProduct={onEditProduct}
            />
          ))}
        </div>
      </div>
    </ScrollUpSection>
  );
}
