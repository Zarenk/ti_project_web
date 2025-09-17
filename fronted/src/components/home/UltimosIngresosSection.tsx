import ScrollUpSection from '@/components/ScrollUpSection';
import MotionProductCard from '@/components/MotionProductCard';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SectionBackground from '../SectionBackground';
import HorizontalScroller from '@/components/HorizontalScroller';

interface Brand {
  name: string;
  logoSvg?: string;
  logoPng?: string;
}

interface RecentProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  brand: Brand | null;
  category: string;
  images: string[];
  stock: number;
}

interface UltimosIngresosSectionProps {
  visibleRecent: RecentProduct[];
  recentIndex: number;
  recentDirection: number;
  nextRecent: () => void;
  prevRecent: () => void;
  recentProductsLength: number;
}

export default function UltimosIngresosSection({
  visibleRecent,
  recentIndex,
  recentDirection,
  nextRecent,
  prevRecent,
  recentProductsLength,
}: UltimosIngresosSectionProps) {
  return (
    <ScrollUpSection className="py-12 bg-white dark:bg-gray-900">
      <SectionBackground />
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4 font-signika blue-scan-underline">
            Últimos ingresos
          </h2>
        </div>
        {/* Mobile: horizontal scroller with chevrons */}
        <div className="md:hidden">
          <HorizontalScroller>
            {visibleRecent.map((product, idx) => (
              <MotionProductCard
                key={`${product.id}-${idx}`}
                product={product}
                withActions
              />
            ))}
          </HorizontalScroller>
        </div>

        {/* Desktop/tablet: keep animated grid with nav chevrons */}
        <div className="relative hidden md:block">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={recentIndex}
              initial={{ x: recentDirection > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: recentDirection > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: 'tween' }}
              className="grid grid-cols-2 lg:grid-cols-5 gap-8"
            >
              {visibleRecent.map((product, idx) => (
                <MotionProductCard
                  key={`${product.id}-${idx}`}
                  product={product}
                  withActions
                />
              ))}
            </motion.div>
          </AnimatePresence>
          {recentProductsLength > 4 && (
            <>
              <motion.button
                aria-label="Anterior"
                onClick={prevRecent}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full shadow"
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <motion.button
                aria-label="Siguiente"
                onClick={nextRecent}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full shadow"
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </ScrollUpSection>
  );
}

