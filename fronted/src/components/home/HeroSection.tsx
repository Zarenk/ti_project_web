"use client"

import { Button } from '@/components/ui/button';
import HeroSlideshow from '@/components/HeroSlideshow';
import SectionBackground from '@/components/SectionBackground';
import { ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Hero3DCarousel from '../Hero3dCarousel';

interface HeroSectionProps {
  heroProducts: any[];
}

export default function HeroSection({ heroProducts }: HeroSectionProps) {

   const sectionRef = useRef<HTMLDivElement>(null);

  const renderAnimatedText = (text: string) => {
    const words = text.split(' ');
    return words.map((word, wordIndex) => (
      <span key={wordIndex} className="inline-block whitespace-nowrap">
        {word.split('').map((char, charIndex) => (
          <span key={`${wordIndex}-${charIndex}`} className="inline-block hero-letter">
            {char}
          </span>
        ))}
        {wordIndex < words.length - 1 && (
          <span className="inline-block hero-letter whitespace-pre">{' '}</span>
        )}
      </span>
    ));
  };

  useEffect(() => {
    import('gsap')
      .then((gsapModule) => {
        const gsap = gsapModule.default;
        gsap.from('.hero-letter', {
          opacity: 0,
          y: 20,
          duration: 0.6,
          stagger: 0.05,
          ease: 'power2.out',
        });
        gsap.from('.hero-description', {
          opacity: 0,
          y: 20,
          duration: 0.6,
          delay: 0.5,
          ease: 'power2.out',
        });
        gsap.from('.hero-buttons', {
          opacity: 0,
          y: 20,
          duration: 0.8,
          delay: 0.8,
        });
      })
      .catch((err) => console.error('GSAP failed to load', err))

    // No context to revert, so just return a cleanup function if needed
    return () => {}
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative z-0 bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 py-20 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"
    >
      <SectionBackground />
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4 hero-title">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-gray-100 leading-tight font-signika">
                {renderAnimatedText('Potencia tu productividad con nuestras')}
                <span className="text-sky-600">
                  {' '}
                  {renderAnimatedText('laptops y componentes')}
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed hero-description">
                Equipos de alto rendimiento para trabajo, estudio y gaming. Encuentra la tecnología perfecta para tus necesidades.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 hero-buttons">
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
          <Hero3DCarousel products={heroProducts} />
        </div>
      </div>
    </section>
  );
}