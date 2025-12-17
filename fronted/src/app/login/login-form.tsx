"use client"

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../dashboard/users/users.api';
import { resendVerificationEmail } from '@/app/signup/api/verification';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getUserDataFromToken } from '@/lib/auth';
import { getAuthToken } from '@/utils/auth-token';
import { jwtDecode } from 'jwt-decode';
import { clearTenantSelection } from '@/utils/tenant-preferences';
import { clearContextPreferences } from '@/utils/context-preferences';

type AttemptState = {
  count: number;
  lockUntil?: number;
  forcedReset?: boolean;
  lastAttemptAt?: number;
};

const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const getAttemptsStorageKey = (email: string) => `loginAttempts:${email}`;

const readAttemptState = (email: string): AttemptState | null => {
  if (typeof window === 'undefined' || !email) {
    return null;
  }
  try {
    const key = getAttemptsStorageKey(email);
    const storedValue = window.localStorage.getItem(key);
    if (!storedValue) return null;
    const parsed = JSON.parse(storedValue) as AttemptState;
    if (parsed && typeof parsed.count === 'number') {
      const now = Date.now();
      const lockExpired = parsed.lockUntil && now >= parsed.lockUntil;
      const hasTimedOut =
        !parsed.forcedReset && parsed.lastAttemptAt && now - parsed.lastAttemptAt >= ONE_HOUR_MS;

      if (!parsed.forcedReset && (lockExpired || hasTimedOut)) {
        window.localStorage.removeItem(key);
        return null;
      }
      return parsed;
    }
  } catch (error) {
    console.error('Error al leer el estado de intentos:', error);
  }
  return null;
};

const persistAttemptState = (email: string, state: AttemptState | null) => {
  if (typeof window === 'undefined' || !email) {
    return;
  }
  const key = getAttemptsStorageKey(email);
  if (!state || state.count <= 0) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(state));
};

const formatRemainingTime = (milliseconds: number) => {
  if (milliseconds <= 0) return '0 segundos';
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null);
  const [lockRemaining, setLockRemaining] = useState<number | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendVerificationStatus, setResendVerificationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (!normalizedEmail) {
      setAttemptState(null);
      setLockRemaining(null);
      return;
    }
    const storedState = readAttemptState(normalizedEmail);
    setAttemptState(storedState);
  }, [normalizedEmail]);

  useEffect(() => {
    if (!normalizedEmail) {
      return;
    }
    setRecoveryEmail((prev) => (prev ? prev : normalizedEmail));
  }, [normalizedEmail]);

  useEffect(() => {
    if (!attemptState?.lockUntil || !normalizedEmail) {
      setLockRemaining(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = attemptState.lockUntil! - Date.now();
      if (remaining <= 0) {
        setLockRemaining(0);
        setAttemptState((prev) => {
          if (!prev?.lockUntil) {
            return prev;
          }
          if (prev.forcedReset) {
            const updated = { ...prev, lockUntil: undefined };
            persistAttemptState(normalizedEmail, updated);
            return updated;
          }

          persistAttemptState(normalizedEmail, null);
          return null;
        });
      } else {
        setLockRemaining(remaining);
      }
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [attemptState?.lockUntil, normalizedEmail]);

  const isForcedReset = Boolean(attemptState?.forcedReset);
  const isLocked = Boolean(attemptState?.lockUntil && (lockRemaining ?? 0) > 0);
  const isLoginDisabled = loading || isLocked || isForcedReset;

  const lockMessage = useMemo(() => {
    if (!attemptState) return null;
    if (attemptState.forcedReset) {
      return 'Por seguridad hemos restablecido tu acceso. Comunicate con soporte para generar una nueva cuenta.';
    }
    if (attemptState.lockUntil && (lockRemaining ?? 0) > 0) {
      return `Tu acceso esta bloqueado temporalmente por ${formatRemainingTime(lockRemaining ?? 0)}.`;
    }
    if (attemptState.count >= 3) {
      return 'Has alcanzado el limite de intentos. El proximo error generara un bloqueo temporal.';
    }
    return null;
  }, [attemptState, lockRemaining]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!normalizedEmail) {
      toast.error('Debes ingresar un correo electronico valido.');
      return;
    }
    if (!password.trim()) {
      toast.error('Debes ingresar tu contraseña.');
      return;
    }

    if (attemptState?.forcedReset) {
      toast.error('Tu cuenta fue bloqueada. Solicita soporte para recuperar el acceso.');
      return;
    }

    const now = Date.now();
    if (attemptState?.lockUntil && now < attemptState.lockUntil) {
      toast.error(`Debes esperar ${formatRemainingTime(attemptState.lockUntil - now)} antes de intentar nuevamente.`);
      return;
    }
    setLoading(true);

    try {
      await loginUser(normalizedEmail, password);
      clearTenantSelection();
      clearContextPreferences();
      await refreshUser();
      setPendingVerificationEmail(null);
      setResendVerificationStatus(null);
      setAttemptState(null);
      persistAttemptState(normalizedEmail, null);
      toast.success('Inicio de sesion exitoso');

      // Redireccion por returnTo si esta presente y es segura (misma app)
      if (typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search)
          const returnTo = params.get('returnTo')
          if (returnTo && returnTo.startsWith('/')) {
            router.replace(returnTo)
            setLoading(false)
            return
          }
        } catch {}
      }

      // Intentar evitar un segundo fetch usando el token local
      try {
        const token = await getAuthToken();
        if (token) {
          const payload: { role?: string } = jwtDecode(token as string);
          const role = payload?.role;
          if (role && ['SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'ADMIN', 'EMPLOYEE'].includes(role)) {
            router.replace('/dashboard');
            setLoading(false);
            return;
          }
          if (role) {
            router.replace('/users');
            setLoading(false);
            return;
          }
        }
      } catch {}
      const data = await getUserDataFromToken();
      if (data?.role && ['SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'ADMIN', 'EMPLOYEE'].includes(data.role)) {
        router.replace('/dashboard');
        setLoading(false);
      } else {
        router.replace('/users');
        setLoading(false);
      }
    } catch (error: any) {
      if (error?.code === 'EMAIL_VERIFICATION_REQUIRED') {
        const emailForResend = error?.email || normalizedEmail;
        setPendingVerificationEmail(emailForResend);
        setResendVerificationStatus(null);
        toast.error(error?.message || 'Debes verificar tu correo antes de continuar.');
        setLoading(false);
        return;
      }
      const nextCount = (attemptState?.count ?? 0) + 1;
      const nextState: AttemptState = {
        count: nextCount,
        lastAttemptAt: Date.now(),
        lockUntil: attemptState?.lockUntil,
        forcedReset: attemptState?.forcedReset,
      };

      let feedbackMessage = error?.message || 'Error al iniciar sesion';

      if (nextCount === 4) {
        nextState.lockUntil = Date.now() + TEN_MINUTES_MS;
        feedbackMessage =
          'Has superado el numero de intentos permitidos. Tu cuenta quedara bloqueada durante 10 minutos.';
      } else if (nextCount === 5) {
        nextState.lockUntil = Date.now() + ONE_HOUR_MS;
        feedbackMessage =
          'Has excedido nuevamente el limite de intentos. Tu cuenta se bloquea durante 1 hora.';
      } else if (nextCount >= 6) {
        nextState.forcedReset = true;
        nextState.lockUntil = undefined;
        feedbackMessage =
          'Se ha restablecido tu acceso por seguridad. Contacta al soporte para generar una nueva cuenta.';
        setRecoveryEmail(normalizedEmail);
      } else {
        const remainingAttempts = Math.max(0, 3 - nextCount);
        if (remainingAttempts > 0) {
          feedbackMessage = `${feedbackMessage}. Te quedan ${remainingAttempts} intentos antes de un bloqueo temporal.`;
        } else {
          feedbackMessage =
            'Has alcanzado el limite de intentos. El proximo fallo bloqueara tu cuenta durante 10 minutos.';
        }
      }

      setAttemptState(nextState);
      persistAttemptState(normalizedEmail, nextState);
      toast.error(feedbackMessage);
    }
    setLoading(false);
  };
  
  const handleGoogle = async () => {
    if (loading) return;
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      toast.error('Google OAuth no esta configurado');
      return;
    }
    try {
      await signIn('google', { callbackUrl: '/google-auth' });
    } catch (error) {
      toast.error('Error al conectar con Google');
    }
  };

  const handleRecoverySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recoveryLoading) return;
    const trimmedEmail = recoveryEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setRecoveryStatus({ type: 'error', message: 'Ingresa un correo electronico valido para continuar.' });
      return;
    }

    setRecoveryLoading(true);
    setRecoveryStatus(null);

    try {
      const response = await fetch('/api/password-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.message || 'No pudimos enviar el correo de recuperacion.';
        setRecoveryStatus({ type: 'error', message });
        toast.error(message);
      } else {
        const message =
          data?.message || 'Te enviamos un correo electronico con los pasos para recuperar tu contraseña.';
        setRecoveryStatus({ type: 'success', message });
        toast.success(message);
      }
    } catch (error) {
      console.error('Error en la solicitud de recuperacion:', error);
      const message = 'Ocurrio un problema al solicitar la recuperacion de la contraseña.';
      setRecoveryStatus({ type: 'error', message });
      toast.error(message);
    }

    setRecoveryLoading(false);
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail || resendVerificationLoading) {
      return;
    }
    setResendVerificationLoading(true);
    setResendVerificationStatus(null);
    try {
      const data = await resendVerificationEmail(pendingVerificationEmail);
      const message =
        data?.message || 'Te enviamos un nuevo correo de verificación.';
      setResendVerificationStatus({ type: 'success', message });
      toast.success(message);
    } catch (error: any) {
      const message =
        error?.message || 'No pudimos reenviar el correo de verificación.';
      setResendVerificationStatus({ type: 'error', message });
      toast.error(message);
    } finally {
      setResendVerificationLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleLogin} className="flex flex-col gap-4" aria-busy={loading}>
        <div>
          <Label htmlFor="email" className="block text-sm font-medium">
            Correo Electronico
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Ingresa tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
            disabled={loading || isForcedReset}
            aria-describedby={lockMessage ? 'login-status-message' : undefined}
          />
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium">
            Contrasena
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Ingresa tu contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
            disabled={loading}
          />
        </div>
        {lockMessage && (
          <p
            id="login-status-message"
            role="status"
            className={`text-sm ${attemptState?.forcedReset ? 'text-amber-600' : 'text-red-600'}`}
          >
            {lockMessage}
          </p>
        )}
        <Button
          type="submit"
          className="w-full hover:cursor-pointer disabled:cursor-not-allowed"
          disabled={isLoginDisabled}
          aria-disabled={isLoginDisabled}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Iniciando...' : 'Iniciar Sesion'}
        </Button>
      </form>
      {pendingVerificationEmail && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-sm font-medium">
            Necesitas confirmar tu correo antes de iniciar sesión. Revisa la bandeja de {pendingVerificationEmail} o
            solicita un nuevo enlace.
          </p>
          {resendVerificationStatus && (
            <p
              className={`mt-2 text-sm ${
                resendVerificationStatus.type === 'error' ? 'text-red-700' : 'text-emerald-700'
              }`}
            >
              {resendVerificationStatus.message}
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full hover:cursor-pointer disabled:cursor-not-allowed"
            onClick={handleResendVerification}
            disabled={resendVerificationLoading}
          >
            {resendVerificationLoading ? 'Enviando...' : 'Reenviar correo de verificación'}
          </Button>
        </div>
      )}
      <div className="relative my-4">
        <Separator className="bg-slate-200" />
        <div className="absolute inset-0 flex justify-center">
          <span className="bg-card px-4 text-sm text-slate-500 font-medium">
            o inicia sesion con
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={handleGoogle}
        className="w-full border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg font-semibold text-slate-700 dark:text-slate-200 transition-all duration-200 bg-transparent hover:cursor-pointer disabled:cursor-not-allowed"
        disabled={loading}
        aria-disabled={loading}
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
        {loading ? 'Procesando...' : 'Iniciar con Google'}
        
      </Button>
      <button
        type="button"
        onClick={() => setShowRecovery((previous) => !previous)}
        className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline hover:cursor-pointer"
        aria-expanded={showRecovery}
        aria-controls="password-recovery-section"
      >
        {showRecovery ? 'Ocultar opciones de recuperacion' : 'Olvidaste tu contrasena?'}
      </button>
      {showRecovery && (
        <section
          id="password-recovery-section"
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
        >
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Olvidaste tu contrasena?
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ingresa tu correo electronico y te enviaremos los pasos necesarios para recuperar el acceso. Revisa tu
            bandeja de entrada y sigue las instrucciones para restablecer tu contrasena.
          </p>
          <form onSubmit={handleRecoverySubmit} className="mt-3 flex flex-col gap-3">
            <div>
              <Label htmlFor="recovery-email" className="text-sm font-medium">
                Correo electronico de recuperacion
              </Label>
              <Input
                id="recovery-email"
                type="email"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                required
                disabled={recoveryLoading}
              />
            </div>
            {recoveryStatus && (
              <p
                role={recoveryStatus.type === 'error' ? 'alert' : 'status'}
                className={`text-sm ${recoveryStatus.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {recoveryStatus.message}
              </p>
            )}
            <Button
              type="submit"
              variant="secondary"
              className="hover:cursor-pointer disabled:cursor-not-allowed"
              disabled={recoveryLoading}
              aria-disabled={recoveryLoading}
            >
              {recoveryLoading ? 'Enviando instrucciones...' : 'Recuperar contrasena'}
            </Button>
          </form>
        </section>
      )}
    </div>
 
  );
}
