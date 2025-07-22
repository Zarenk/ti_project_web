'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { registerUser } from './register.api';
import { loginUser } from '../dashboard/users/users.api';
import { useAuth } from '@/context/auth-context';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: 'El nombre es obligatorio' })
      .min(1, 'El nombre es obligatorio'),
    email: z
      .string({ required_error: 'El correo es obligatorio' })
      .email('Correo electrónico inválido'),
    password: z
      .string({ required_error: 'La contraseña es obligatoria' })
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string({ required_error: 'Confirma tu contraseña' })
      .min(6, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type RegisterType = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterType>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterType) => {
    try {
      await registerUser(data.email, data.fullName, data.password, data.fullName);
      await loginUser(data.email, data.password);
      refreshUser();
      toast.success('Registro exitoso');
      router.push('/users');
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('correo')) {
        setError('email', { type: 'manual', message: error.message });
      } else {
        toast.error(error.message || 'Error al registrarse');
      }
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
    <div className="w-full max-w-md">
      <div className="bg-card rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Crear cuenta</h1>
            <p className="text-slate-600">Completa tus datos para registrarte</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-700 font-medium">Nombre completo</Label>
              <Input id="fullName" type="text" placeholder="Ingresa tu nombre completo" {...register('fullName')} className="h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg" />
              {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="tu@ejemplo.com" {...register('email')} className="h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg" />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Contraseña</Label>
              <Input id="password" type="password" placeholder="Crea una contraseña" {...register('password')} className="h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg" />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirmar contraseña</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirma tu contraseña" {...register('confirmPassword')} className="h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg" />
              {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">Registrarse</Button>
          </form>
          <div className="relative my-8">
            <Separator className="bg-slate-200" />
            <div className="absolute inset-0 flex justify-center">
              <span className="bg-white px-4 text-sm text-slate-500 font-medium">o regístrate con</span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleGoogle}
            className="w-full h-12 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg font-semibold text-slate-700 transition-all duration-200 bg-transparent"
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
            Continuar con Google
          </Button>
          <div className="text-center mt-8">
            <p className="text-slate-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-blue-600 hover:text-cyan-500 font-semibold hover:underline transition-colors duration-200">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }