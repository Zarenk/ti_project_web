'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../dashboard/users/users.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await loginUser(email, password);
      toast.success('Inicio de sesión exitoso');

      router.push('/dashboard'); // Redirige al dashboard después del login
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800">
      <div className="bg-gray-700 shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-100 mb-6">Bienvenido</h1>
        <p className="text-center text-gray-100 mb-6">
          Inicia sesión para acceder a tu cuenta
        </p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-100">
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
            <Label htmlFor="password" className="block text-sm font-medium text-gray-100">
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
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Iniciar Sesión
          </Button>
        </form>
        <p className="text-center text-sm text-gray-100 mt-4">
          ¿No tienes una cuenta?{' '}
          <a href="/register" className="text-blue-400 font-bold hover:underline">
            Regístrate aquí
          </a>
        </p>
      </div>
    </div>
  );
}