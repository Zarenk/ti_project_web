
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getUserDataFromToken, isTokenValid } from '@/lib/auth';
import UserForm from './user-form';

export default function UserNewPage() {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const data = await getUserDataFromToken();
      if (!data || !(await isTokenValid()) || data.role !== 'ADMIN') {
        router.replace('/dashboard');
      }
    }
    check();
  }, [router]);

  return (
    <div className="flex justify-center items-start min-h-screen p-3">
      <Card className="w-full max-w-lg sm:max-w-md md:max-w-lg lg:max-w-2xl">
        <CardHeader className="pb-2 sm:pb-2">
          <CardTitle className="text-center text-xl font-bold pt-5">
            Crear Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm />
        </CardContent>
      </Card>
    </div>
  );
}