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
    async function check() {
      if (await isTokenValid()) {
        const data = await getUserDataFromToken();
        if (data) {
          if (data.role && ['SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'ADMIN', 'EMPLOYEE'].includes(data.role)) {
            router.replace('/dashboard');
          } else {
            router.replace('/users');
          }
        }
      }
    }
    check();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-3">
      <div className="login-scan-border relative w-full max-w-md rounded-[32px]">
        <Card className="relative w-full rounded-[28px] border border-slate-200/50 bg-card/95 shadow-xl backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-center">Bienvenido</CardTitle>
          <CardDescription className="text-center">
            Inicia sesion para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center flex flex-col gap-2">
          <p className="text-sm">
            Aun no tienes una cuenta?{' '}
            <Link href="/register" className="font-semibold underline">
              Registrate aqui
            </Link>
          </p>
          <Link href="/" className="text-sm font-semibold underline">
            Volver al inicio
          </Link>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}
