"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from './login-form';
import Link from 'next/link';

export default function LoginPage() {
  // No token check here — LoginForm handles post-login redirect.
  // A previous useEffect calling isTokenValid() caused reload loops:
  // middleware clears httpOnly cookie but localStorage token survives,
  // isTokenValid() succeeds via Authorization header → redirects to
  // /dashboard → middleware bounces back → infinite loop on mobile.

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
