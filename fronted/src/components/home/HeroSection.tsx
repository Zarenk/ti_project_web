import { Button } from '@/components/ui/button';
import HeroSlideshow from '@/components/HeroSlideshow';
import { ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  heroProducts: any[];
}

export default function HeroSection({ heroProducts }: HeroSectionProps) {
  return (
    <section className="relative bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 py-20 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                Potencia tu productividad con nuestras <span className="text-sky-600">laptops y componentes</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Equipos de alto rendimiento para trabajo, estudio y gaming. Encuentra la tecnología perfecta para tus necesidades.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 text-lg">
                Ver productos
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-sky-300 text-sky-600 hover:bg-sky-50 px-8 py-3 text-lg bg-transparent"
              >
                Ofertas especiales
              </Button>
            </div>
          </div>
          <HeroSlideshow products={heroProducts} />
        </div>
      </div>
    </section>
  );
}