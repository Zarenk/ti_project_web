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
 
  );
}