"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from './login-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isTokenValid, getUserDataFromToken } from '@/lib/auth';

export default function LoginPage() {

  const router = useRouter();

  useEffect(() => {
    if (isTokenValid()) {
      const data = getUserDataFromToken();
      if (data?.role === 'ADMIN' || data?.role === 'EMPLOYEE') {
        router.replace('/dashboard');
      } else {
        router.replace('/users');
      }
    }
  }, [router]);

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
        <CardFooter className="justify-center flex flex-col gap-2">
          <p className="text-sm">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="font-semibold underline">
              Regístrate aquí
            </Link>
          </p>
          <Link href="/" className="text-sm font-semibold underline">
            Volver al inicio
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}