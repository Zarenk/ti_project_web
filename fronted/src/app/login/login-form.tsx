"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../dashboard/users/users.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import { useAuth } from '@/context/auth-context';
import { getUserDataFromToken } from '@/lib/auth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await loginUser(email, password);
      refreshUser();
      toast.success('Inicio de sesión exitoso');

      const data = getUserDataFromToken();
      if (data?.role === 'ADMIN' || data?.role === 'EMPLOYEE') {
        router.push('/dashboard');
      } else {
        router.push('/users');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    }
  };
  
  const handleGoogle = async () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      toast.error('Google OAuth no está configurado');
      return;
    }
    try {
      await signIn('google', { callbackUrl: '/google-auth' });
    } catch (error) {
      toast.error('Error al conectar con Google');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email" className="block text-sm font-medium">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Ingresa tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>

      <div>
          <Label htmlFor="password" className="block text-sm font-medium">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full">
          Iniciar Sesión
        </Button>
      </form>
      <div className="relative my-4">
        <Separator className="bg-slate-200" />
        <div className="absolute inset-0 flex justify-center">
          <span className="bg-card px-4 text-sm text-slate-500 font-medium">
            o inicia sesión con
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={handleGoogle}
        className="w-full border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg font-semibold text-slate-700 transition-all duration-200 bg-transparent"
      >
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.494 12.275c0-.855-.073-1.677-.21-2.47H12v4.675h6.373a6.681 6.681 0 0 1-2.886 4.382v3.638h4.666c2.734-2.515 4.336-6.214 4.336-10.225z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.464 0 6.372-1.14 8.497-3.085l-4.567-3.611a9.958 9.958 0 0 1-3.93.882c-3.846 0-7.107-2.59-8.27-6.044H.606v3.792C2.425 20.897 6.843 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M3.733 8.169a9.993 9.993 0 0 1 0-4.337L.606 1.848A11.99 11.99 0 0 0 0 12c0 1.841.315 3.612.892 5.213l3.32-2.514a9.952 9.952 0 0 1-.479-3.529z"
          />
          <path
            fill="#EA4335"
            d="M12 4.594c1.415 0 2.707.488 3.728 1.39l2.797-2.797C16.728 1.067 14.48 0 12 0 7.637 0 3.915 2.362 2.289 5.883l3.35 2.58C7.207 6.389 9.425 4.594 12 4.594z"
          />
        </svg>
        Iniciar con Google
      </Button>
    </div>
 
  );
}