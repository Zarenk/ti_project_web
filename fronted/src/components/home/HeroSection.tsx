"use client"

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import HeroSlideshow from '@/components/HeroSlideshow';
import SectionBackground from '@/components/SectionBackground';
import { ChevronRight } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from 'react';
import HeroCollageCarousel from '../HeroCollageCarousel';
import { useSiteSettings } from '@/context/site-settings-context';

const DEFAULT_HERO_TITLE = 'Potencia tu productividad con nuestras laptops y componentes';
const DEFAULT_HERO_SUBTITLE = 'Equipos de alto rendimiento para trabajo, estudio y gaming. Encuentra la tecnología perfecta para tus necesidades.';
const DEFAULT_HERO_CTA = 'Ver productos';
const DEFAULT_HERO_CTA_HREF = '/store';

interface HeroSectionProps {
  heroProducts: any[];
  onEditProduct?: (productId: number) => void;
}

export default function HeroSection({ heroProducts, onEditProduct }: HeroSectionProps) {
  const { settings } = useSiteSettings();
  const sectionRef = useRef<HTMLDivElement>(null);
  const heroSettings = settings.hero;
  const heroTitle = heroSettings.title?.trim() || DEFAULT_HERO_TITLE;
  const heroSubtitle = heroSettings.subtitle?.trim() || DEFAULT_HERO_SUBTITLE;
  const heroCtaLabel = heroSettings.ctaLabel?.trim() || DEFAULT_HERO_CTA;
  const heroCtaHref = heroSettings.ctaHref?.trim() || DEFAULT_HERO_CTA_HREF;
  const heroEnableCarousel = heroSettings.enableCarousel;
  const heroParticles = heroSettings.particles;

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
    let ctx: any
    import('gsap')
      .then((gsapModule) => {
        const gsap = gsapModule.default
        // Scope all selectors to this section and ensure clean state
        ctx = gsap.context(() => {
          // Ensure consistent, explicit initial state to avoid flicker/reverse fades
          gsap.set(['.hero-letter', '.hero-description', '.hero-buttons'], {
            opacity: 0,
            y: 20,
          })

          gsap.to('.hero-letter', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.05,
            ease: 'power2.out',
          })

          gsap.to('.hero-description', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: 0.25,
            ease: 'power2.out',
          })

          gsap.to('.hero-buttons', {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.45,
            ease: 'power2.out',
          })
        }, sectionRef)
      })
      .catch((err) => console.error('GSAP failed to load', err))

    return () => ctx?.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative z-0 bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 py-12 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"
    >
      {heroParticles ? <SectionBackground /> : null}
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-8">
            <div className="space-y-1 hero-title">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-gray-100 leading-tight font-signika">
                {renderAnimatedText(heroTitle)}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed hero-description">
                {heroSubtitle}
              </p>
            </div>
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-col sm:flex-row gap-4 hero-buttons">
                {heroCtaLabel && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        size="lg"
                        className="spin-parent diag-shimmer bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 text-lg transition-transform duration-300 ease-in-out hover:scale-105"
                      >
                        <Link href={heroCtaHref}>
                          <span className="spin-content">
                            {heroCtaLabel}
                            <ChevronRight className="w-5 h-5 ml-2" />
                          </span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                      {heroCtaHref}
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="spin-parent diag-shimmer diag-shimmer--delay border-sky-300 text-sky-600 hover:bg-sky-50 px-8 py-3 text-lg bg-transparent transition-transform duration-300 ease-in-out hover:scale-105"
                    >
                      <Link href="/store">
                        <span className="spin-content">Ofertas especiales</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    Ver Ofertas especiales
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
          {heroEnableCarousel ? (
            <HeroSlideshow products={heroProducts} onEditProduct={onEditProduct} />
          ) : (
            <HeroCollageCarousel products={heroProducts} />
          )}
        </div>
      </div>
    </section>
  );
}
