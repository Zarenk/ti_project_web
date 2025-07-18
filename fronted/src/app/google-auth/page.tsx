"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { loginUser } from '../dashboard/users/users.api';
import { getUserDataFromToken } from '@/lib/auth';
import { createClient, registerUser } from '../register/register.api';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GoogleAuthPage() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        setSuccess('Registro completado con éxito');
        await new Promise((r) => setTimeout(r, 1000));
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
        setError(null);
        setSuccess('Autenticación exitosa');
        await new Promise((r) => setTimeout(r, 1000));
        router.push('/store');
        return;
      } catch (err: any) {
        setError(err.message || 'No se pudo iniciar sesión');
      }
    }
    processLogin();
  }, [router]);

  return (
    <div className="p-4 text-center flex flex-col items-center gap-4">
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 flex items-center gap-2"
        >
          <AlertCircle className="w-5 h-5" /> {error}
        </motion.p>
      )}
      {success && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-green-600 flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" /> {success}
        </motion.p>
      )}
      {!success && !error && (
        <>
          <motion.div
            className="flex justify-center"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <Loader2 className="h-10 w-10 text-primary" />
          </motion.div>
          <motion.p
            className="text-sm"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            Procesando autenticación...
          </motion.p>
        </>
      )}
      {image && (
        <img
          src={image}
          alt="Google avatar"
          className="w-20 h-20 rounded-full mx-auto"
        />
      )}
    </div>
  );
}