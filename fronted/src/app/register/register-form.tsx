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
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: 'El nombre es obligatorio' })
      .min(1, 'El nombre es obligatorio'),
    email: z
      .string({ required_error: 'El correo es obligatorio' })
      .email('Correo electronico invalido'),
    username: z.string().optional(),
    password: z
      .string({ required_error: 'La contrasena es obligatoria' })
      .min(6, 'La contrasena debe tener al menos 6 caracteres'),
    confirmPassword: z
      .string({ required_error: 'Confirma tu contrasena' })
      .min(6, 'Confirma tu contrasena'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contrasenas no coinciden',
  });

type RegisterType = z.infer<typeof registerSchema>;
type Tone = 'default' | 'error' | 'success';

function getInputToneClasses(tone: Tone): string {
  if (tone === 'error') {
    return 'border-rose-400/70 bg-rose-50/80 focus:border-rose-500 focus:ring-rose-400/40 dark:border-rose-500/60 dark:bg-rose-950/20';
  }
  if (tone === 'success') {
    return 'border-emerald-400/70 bg-emerald-50/70 focus:border-emerald-500 focus:ring-emerald-400/40 dark:border-emerald-500/60 dark:bg-emerald-950/20';
  }
  return 'border-slate-300 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700';
}

function getFieldTone(hasError: boolean, hasValue: boolean, interacted: boolean): Tone {
  if (!interacted) return 'default';
  if (hasError) return 'error';
  if (hasValue) return 'success';
  return 'default';
}

function resolveFieldMessage(
  errorMessage: string | undefined,
  successMessage: string,
  hasValue: boolean,
  interacted: boolean,
): string | null {
  if (!interacted) return null;
  if (errorMessage) return errorMessage;
  if (hasValue) return successMessage;
  return null;
}

function FieldStateChip({
  tone,
  text,
  visible,
}: {
  tone: Tone;
  text: string;
  visible: boolean;
}) {
  if (!visible) return null;
  if (tone === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
        <AlertTriangle className="h-3 w-3" />
        {text}
      </span>
    );
  }
  if (tone === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        {text}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
      {text}
    </span>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields, isSubmitted, isSubmitting },
    setError,
  } = useForm<RegisterType>({ resolver: zodResolver(registerSchema) });

  const fullNameValue = watch('fullName') ?? '';
  const emailValue = watch('email') ?? '';
  const usernameValue = watch('username') ?? '';
  const passwordValue = watch('password') ?? '';
  const confirmPasswordValue = watch('confirmPassword') ?? '';

  const fullNameInteracted = Boolean(touchedFields.fullName) || isSubmitted;
  const emailInteracted = Boolean(touchedFields.email) || isSubmitted;
  const usernameInteracted = Boolean(touchedFields.username) || usernameValue.trim().length > 0;
  const passwordInteracted = Boolean(touchedFields.password) || isSubmitted;
  const confirmPasswordInteracted = Boolean(touchedFields.confirmPassword) || isSubmitted;

  const fullNameTone = getFieldTone(Boolean(errors.fullName), fullNameValue.trim().length > 0, fullNameInteracted);
  const emailTone = getFieldTone(Boolean(errors.email), emailValue.trim().length > 0, emailInteracted);
  const usernameTone = getFieldTone(Boolean(errors.username), usernameValue.trim().length > 0, usernameInteracted);
  const passwordTone = getFieldTone(Boolean(errors.password), passwordValue.trim().length > 0, passwordInteracted);
  const confirmPasswordTone = getFieldTone(
    Boolean(errors.confirmPassword),
    confirmPasswordValue.trim().length > 0,
    confirmPasswordInteracted,
  );

  const fullNameMessage = resolveFieldMessage(
    errors.fullName?.message,
    'Nombre valido.',
    fullNameValue.trim().length > 0,
    fullNameInteracted,
  );
  const emailMessage = resolveFieldMessage(
    errors.email?.message,
    'Correo valido.',
    emailValue.trim().length > 0,
    emailInteracted,
  );
  const usernameMessage = resolveFieldMessage(
    errors.username?.message,
    'Usuario disponible para registro.',
    usernameValue.trim().length > 0,
    usernameInteracted,
  );
  const passwordMessage = resolveFieldMessage(
    errors.password?.message,
    'Contrasena valida.',
    passwordValue.trim().length >= 6,
    passwordInteracted,
  );
  const confirmPasswordMessage = resolveFieldMessage(
    errors.confirmPassword?.message,
    'Contrasenas coinciden.',
    confirmPasswordValue.trim().length >= 6 && confirmPasswordValue === passwordValue,
    confirmPasswordInteracted,
  );

  const onSubmit = async (data: RegisterType) => {
    try {
      const username = data.username?.trim() || data.email.split('@')[0];
      await registerUser(data.email, username, data.password, data.fullName);
      await loginUser(data.email, data.password);
      await refreshUser();
      toast.success('Registro exitoso');
      router.push('/users');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Error al registrarse';

      if (message.toLowerCase().includes('correo')) {
        setError('email', { type: 'manual', message });
      } else if (message.toLowerCase().includes('usuario')) {
        setError('username', { type: 'manual', message });
      } else {
        toast.error(message);
      }
    }
  };

  const handleGoogle = async () => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      toast.error('Google OAuth no esta configurado');
      return;
    }
    try {
      await signIn('google', { callbackUrl: '/google-auth' });
    } catch {
      toast.error('Error al conectar con Google');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Crear cuenta</h1>
          <p className="text-slate-600 dark:text-slate-300">Completa tus datos para registrarte</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300 font-medium">Nombre completo</Label>
              <FieldStateChip
                tone={fullNameTone}
                text={fullNameTone === 'error' ? 'Requerido' : fullNameTone === 'success' ? 'Listo' : 'Campo requerido'}
                visible={fullNameInteracted}
              />
            </div>
            <Input
              id="fullName"
              type="text"
              placeholder="Ingresa tu nombre completo"
              {...register('fullName')}
              className={`h-12 rounded-lg transition-colors ${getInputToneClasses(fullNameTone)}`}
              aria-invalid={fullNameTone === 'error'}
            />
            {fullNameMessage ? (
              <p className={`text-sm ${fullNameTone === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {fullNameMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">Correo electronico</Label>
              <FieldStateChip
                tone={emailTone}
                text={emailTone === 'error' ? 'Invalido' : emailTone === 'success' ? 'Listo' : 'Campo requerido'}
                visible={emailInteracted}
              />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              {...register('email')}
              className={`h-12 rounded-lg transition-colors ${getInputToneClasses(emailTone)}`}
              aria-invalid={emailTone === 'error'}
            />
            {emailMessage ? (
              <p className={`text-sm ${emailTone === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {emailMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-medium">Nombre de usuario</Label>
              <FieldStateChip
                tone={usernameTone}
                text={usernameTone === 'error' ? 'Invalido' : usernameTone === 'success' ? 'Listo' : 'Opcional'}
                visible={usernameInteracted}
              />
            </div>
            <Input
              id="username"
              type="text"
              placeholder="Ingresa tu nombre de usuario"
              {...register('username')}
              className={`h-12 rounded-lg transition-colors ${getInputToneClasses(usernameTone)}`}
              aria-invalid={usernameTone === 'error'}
            />
            {usernameMessage ? (
              <p className={`text-sm ${usernameTone === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {usernameMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">Contrasena</Label>
              <FieldStateChip
                tone={passwordTone}
                text={passwordTone === 'error' ? 'Invalida' : passwordTone === 'success' ? 'Listo' : 'Campo requerido'}
                visible={passwordInteracted}
              />
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Crea una contrasena"
              {...register('password')}
              className={`h-12 rounded-lg transition-colors ${getInputToneClasses(passwordTone)}`}
              aria-invalid={passwordTone === 'error'}
            />
            {passwordMessage ? (
              <p className={`text-sm ${passwordTone === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {passwordMessage}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 font-medium">Confirmar contrasena</Label>
              <FieldStateChip
                tone={confirmPasswordTone}
                text={confirmPasswordTone === 'error' ? 'No coincide' : confirmPasswordTone === 'success' ? 'Listo' : 'Campo requerido'}
                visible={confirmPasswordInteracted}
              />
            </div>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirma tu contrasena"
              {...register('confirmPassword')}
              className={`h-12 rounded-lg transition-colors ${getInputToneClasses(confirmPasswordTone)}`}
              aria-invalid={confirmPasswordTone === 'error'}
            />
            {confirmPasswordMessage ? (
              <p className={`text-sm ${confirmPasswordTone === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {confirmPasswordMessage}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Registrando...' : 'Registrarse'}
          </Button>
        </form>

        <div className="relative my-8">
          <Separator className="bg-slate-200 dark:bg-slate-700" />
          <div className="absolute inset-0 flex justify-center">
            <span className="bg-card px-4 text-sm text-slate-500 dark:text-slate-400 font-medium">o registrate con</span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleGoogle}
          disabled={isSubmitting}
          className="w-full h-12 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg font-semibold text-slate-700 dark:text-slate-200 transition-all duration-200 bg-transparent disabled:cursor-not-allowed"
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
          <p className="text-slate-600 dark:text-slate-300">
            Ya tienes cuenta?{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-cyan-500 dark:hover:text-cyan-400 font-semibold hover:underline transition-colors duration-200">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
