import ScrollUpSection from '@/components/ScrollUpSection';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';

interface HomeCategory {
  name: string;
  icon: LucideIcon;
  count: number;
}

interface CategoriesSectionProps {
  categories: HomeCategory[];
  visibleCategories: HomeCategory[];
  categoryIndex: number;
  direction: number;
  nextCategories: () => void;
  prevCategories: () => void;
  categoriesLength: number;
}

export default function CategoriesSection({
  categories,
  visibleCategories,
  categoryIndex,
  direction,
  nextCategories,
  prevCategories,
  categoriesLength,
}: CategoriesSectionProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const amount = Math.max(240, Math.floor(el.clientWidth * 0.8))
    el.scrollBy({ left: dir * amount, behavior: 'smooth' })
  }
  return (
    <ScrollUpSection className="py-12 bg-gradient-to-b from-sky-50 to-white dark:from-gray-900 dark:to-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Explora por categoría</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Encuentra exactamente lo que necesitas en nuestras categorías especializadas
          </p>
        </div>
        {/* Mobile: single-row horizontal carousel */}
        <div className="relative md:hidden">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-[10vw]"
          >
            {categories.map((category, index) => (
              <Link key={index} href={`/store?category=${encodeURIComponent(category.name)}`}>
                <motion.div className="snap-center" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Card className="w-[80vw] max-w-[80vw] h-full group hover:shadow-lg transition-all duration-300 cursor-pointer border-sky-100 hover:border-sky-200">
                    <CardContent className="p-6 text-center flex flex-col justify-between h-full">
                      <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <category.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-sky-600 transition-colors line-clamp-2">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{category.count}+ productos</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            ))}
          </div>
          {categoriesLength > 1 && (
            <>
              <motion.button aria-label="Anterior" onClick={() => scrollByCard(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow" whileTap={{ scale: 0.9 }}>
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <motion.button aria-label="Siguiente" onClick={() => scrollByCard(1)} className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow" whileTap={{ scale: 0.9 }}>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </>
          )}
        </div>

        {/* Desktop/tablet: keep grid with pagination */}
        <div className="relative hidden md:block">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={categoryIndex}
              initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: 'tween' }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 items-stretch"
            >
              {visibleCategories.map((category, index) => (
                <Link key={index} href={`/store?category=${encodeURIComponent(category.name)}`}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Card className="h-full group hover:shadow-lg transition-all duration-300 cursor-pointer border-sky-100 hover:border-sky-200">
                      <CardContent className="p-6 text-center flex flex-col justify-between h-full">
                        <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                          <category.icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-sky-600 transition-colors line-clamp-2">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{category.count}+ productos</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          </AnimatePresence>
          {categoriesLength > 6 && (
            <>
              <motion.button
                aria-label="Anterior"
                onClick={prevCategories}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full shadow"
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <motion.button
                aria-label="Siguiente"
                onClick={nextCategories}
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
