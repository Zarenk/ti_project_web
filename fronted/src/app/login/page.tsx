import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-3">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-center">Bienvenido</CardTitle>
          <CardDescription className="text-center">
            Inicia sesión para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm">
            ¿No tienes una cuenta?{' '}
            <a href="/register" className="font-semibold underline">
              Regístrate aquí
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}