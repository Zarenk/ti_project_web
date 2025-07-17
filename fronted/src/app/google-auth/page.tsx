import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { registerUser, createClient } from '../register/register.api';
import { loginUser } from '../dashboard/users/users.api';
import { getUserDataFromToken } from '@/lib/auth';

export default function GoogleAuthPage() {
  const router = useRouter();

  useEffect(() => {
    async function processLogin() {
      const session = await getSession();
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }
      const email = session.user.email as string;
      const name = session.user.name || email;
      try {
        const user = await registerUser(email, name, email);
        await createClient({ name, userId: user.id });
      } catch (_) {
        // ignore errors on registration/creation (user may exist)
      }
      try {
        await loginUser(email, email);
        const data = getUserDataFromToken();
        if (data) {
          try { await createClient({ name, userId: data.userId }); } catch (_) {}
        }
      } catch (_) {}
      router.push('/dashboard');
    }
    processLogin();
  }, [router]);

  return <p className="p-4">Procesando autenticación...</p>;
}