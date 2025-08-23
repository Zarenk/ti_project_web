import ScrollUpSection from '@/components/ScrollUpSection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NewsletterSectionProps {
  email: string;
  setEmail: (value: string) => void;
  handleSubscribe: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function NewsletterSection({ email, setEmail, handleSubscribe }: NewsletterSectionProps) {
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
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="email"
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800 border-0 rounded-full shadow-md focus:ring"
            />
            <Button type="submit" className="bg-white text-blue-700 hover:bg-blue-50 px-8 rounded-full shadow-md focus:ring">
              Suscribirme
            </Button>
          </form>
          
        </div>
      </div>
    </ScrollUpSection>
  );
}