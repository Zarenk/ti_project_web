import ScrollUpSection from '@/components/ScrollUpSection';
import type { LucideIcon } from 'lucide-react';

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface BenefitsSectionProps {
  benefits: Benefit[];
}

export default function BenefitsSection({ benefits }: BenefitsSectionProps) {
  return (
    <ScrollUpSection className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">¿Por qué comprar con nosotros?</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Ofrecemos la mejor experiencia de compra con servicios que marcan la diferencia
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <benefit.icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">{benefit.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </ScrollUpSection>
  );
}