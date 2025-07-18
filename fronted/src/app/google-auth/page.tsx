"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { loginUser } from '../dashboard/users/users.api';
import { getUserDataFromToken } from '@/lib/auth';
import { createClient, registerUser } from '../register/register.api';

export default function GoogleAuthPage() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processLogin() {
      const session = await getSession();
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }
      const email = session.user.email as string;
      const name = session.user.name || email;
      const img = session.user.image || undefined;
      setImage(session.user.image || null);
      try {
        const user = await registerUser(email, name, email);
        await createClient({ name, userId: user.id, image: img });
      } catch (err: any) {
        if (err.message?.includes('registrado')) {
          setError('El correo ya está registrado');
        }
      }
      try {
        await loginUser(email, email);
        const data = getUserDataFromToken();
        if (data) {
          try {
            await createClient({ name, userId: data.userId, image: img });
          } catch (_) {}
        }
        router.push('/store');
        return;
      } catch (err: any) {
        setError(err.message || 'No se pudo iniciar sesión');
      }
    }
    processLogin();
  }, [router]);

  return (
    <div className="p-4 text-center">
      {error ? <p className="text-red-500">{error}</p> : <p>Procesando autenticación...</p>}
      {image && (
        <img
          src={image}
          alt="Google avatar"
          className="w-20 h-20 rounded-full mx-auto mt-4"
        />
      )}
    </div>
  );
}