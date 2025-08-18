import ScrollUpSection from '@/components/ScrollUpSection';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface Testimonial {
  name: string;
  rating: number;
  comment: string;
  location: string;
}

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export default function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <ScrollUpSection className="py-20 bg-gradient-to-b from-sky-50 to-white dark:from-gray-900 dark:to-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Lo que dicen nuestros clientes</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Miles de clientes satisfechos confían en nosotros para sus necesidades tecnológicas
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-sky-100 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed italic">"{testimonial.comment}"</p>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{testimonial.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{testimonial.location}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollUpSection>
  );
}