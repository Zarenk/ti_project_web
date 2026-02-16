"use client"

import ScrollUpSection from '@/components/ScrollUpSection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { subscribeToNewsletter } from './newsletter.api';

const schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
});

type FormValues = z.infer<typeof schema>;

export default function NewsletterSection() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await subscribeToNewsletter(values.email);
      toast.success('Suscripción exitosa');
      reset();
    } catch (err) {
      console.error(err);
      toast.error('Error al suscribirse');
    }
  };

  return (
    <ScrollUpSection className="py-12 bg-gradient-to-r from-blue-700 to-blue-800 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Suscríbete y recibe ofertas exclusivas
          </h2>
          <p className="text-xl text-blue-100 mb-6">
            Mantente al día con las últimas novedades, ofertas especiales y lanzamientos de productos
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 text-left">
              <Input
                type="email"
                placeholder="Tu correo electrónico"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className="flex-1 bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800 border-0 rounded-full shadow-md focus:ring"
              />
              {errors.email && (
                <span id="email-error" className="mt-1 block text-sm text-yellow-200">
                  {errors.email.message}
                </span>
              )}
            </div>
            <Button
              type="submit"
              title="Haz clic para suscribirte y recibir ofertas"
              className="bg-white text-blue-700 hover:bg-blue-50 px-8 rounded-full shadow-md focus:ring hover:cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando…' : 'Suscribirme'}
            </Button>
          </form>
        </div>
      </div>
    </ScrollUpSection>
  );
}

