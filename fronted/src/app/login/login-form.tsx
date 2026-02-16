"use client"

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, requestPasswordRecovery } from '../dashboard/users/users.api';
import { resendVerificationEmail } from '@/app/signup/api/verification';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null);
  const [lockRemaining, setLockRemaining] = useState<number | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySubmitAttempted, setRecoverySubmitAttempted] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendVerificationStatus, setResendVerificationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordAuthError, setPasswordAuthError] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailFormatRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  type FieldValidationState = {
    tone: 'default' | 'error' | 'success';
    message: string | null;
    chipText: string;
  };

  const emailValidation = useMemo<FieldValidationState>(() => {
    const value = email.trim();
    if (!value) {
      return {
        tone: submitAttempted ? 'error' : 'default',
        message: submitAttempted ? 'El correo es obligatorio.' : null,
        chipText: submitAttempted ? 'Requerido' : 'Campo requerido',
      };
    }
    if (!emailFormatRegex.test(value)) {
      return {
        tone: 'error',
        message: 'Ingresa un correo valido (ejemplo@dominio.com).',
        chipText: 'Formato invalido',
      };
    }
    return { tone: 'success', message: 'Correo valido.', chipText: 'Listo' };
  }, [email, emailFormatRegex, submitAttempted]);

  const passwordValidation = useMemo<FieldValidationState>(() => {
    const value = password.trim();
    if (!value) {
      return {
        tone: submitAttempted ? 'error' : 'default',
        message: submitAttempted ? 'La contrasena es obligatoria.' : null,
        chipText: submitAttempted ? 'Requerido' : 'Campo requerido',
      };
    }
    if (passwordAuthError) {
      return {
        tone: 'error',
        message: 'Contrasena incorrecta.',
        chipText: 'Error',
      };
    }
    return {
      tone: 'success',
      message: 'Contrasena ingresada.',
      chipText: 'Listo',
    };
  }, [password, submitAttempted, passwordAuthError]);

  const emailInteracted = submitAttempted || email.length > 0;
  const passwordInteracted = submitAttempted || password.length > 0;
  const recoveryInteracted = recoverySubmitAttempted || recoveryEmail.length > 0;

  const recoveryValidation = useMemo<FieldValidationState>(() => {
    const value = recoveryEmail.trim();
    if (!value) {
      return {
        tone: recoverySubmitAttempted ? 'error' : 'default',
        message: recoverySubmitAttempted
          ? 'El correo de recuperacion es obligatorio.'
          : null,
        chipText: recoverySubmitAttempted ? 'Requerido' : 'Campo requerido',
      };
    }
    if (!emailFormatRegex.test(value)) {
      return {
        tone: 'error',
        message: 'Ingresa un correo valido (ejemplo@dominio.com).',
        chipText: 'Formato invalido',
      };
    }
    return {
      tone: 'success',
      message: 'Correo valido para recuperacion.',
      chipText: 'Listo',
    };
  }, [emailFormatRegex, recoveryEmail, recoverySubmitAttempted]);

  const getInputToneClasses = (tone: FieldValidationState['tone']) => {
    if (tone === 'error') {
      return 'border-rose-400/70 bg-rose-50/80 focus-visible:ring-rose-400/40 dark:border-rose-500/60 dark:bg-rose-950/20';
    }
    if (tone === 'success') {
      return 'border-emerald-400/70 bg-emerald-50/70 focus-visible:ring-emerald-400/40 dark:border-emerald-500/60 dark:bg-emerald-950/20';
    }
    return 'border-slate-300/80 bg-white/90 focus-visible:ring-blue-400/40 dark:border-slate-700 dark:bg-slate-950/40';
  };

  const FieldStateChip = ({
    state,
    visible,
  }: {
    state: FieldValidationState;
    visible: boolean;
  }) => {
    if (!visible) return null;
    if (state.tone === 'error') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertTriangle className="h-3 w-3" />
          {state.chipText}
        </span>
      );
    }
    if (state.tone === 'success') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          {state.chipText}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        {state.chipText}
      </span>
    );
  };

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
    setSubmitAttempted(true);
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
      setPasswordAuthError(false);
      persistAttemptState(normalizedEmail, null);
      toast.success('Inicio de sesion exitoso');

      // Limpiar lastPath al cambiar de usuario para evitar redirigir
      // a rutas protegidas de una sesion anterior
      if (typeof window !== 'undefined') {
        try { window.sessionStorage.removeItem("ti.lastPath") } catch {}
      }

      // Determinar rol del usuario para decidir redireccion
      let userRole: string | null = null
      try {
        const token = await getAuthToken();
        if (token) {
          const payload: { role?: string } = jwtDecode(token as string);
          userRole = payload?.role ?? null;
        }
      } catch {}
      if (!userRole) {
        try {
          const data = await getUserDataFromToken();
          userRole = data?.role ?? null;
        } catch {}
      }

      const dashboardRoles = ['SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'ADMIN', 'EMPLOYEE']
      const bypassPermissionRoles = ['SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG', 'ADMIN']
      const normalizedRole = userRole?.trim().toUpperCase() ?? ''

      // Solo permitir returnTo para roles que pueden acceder a cualquier modulo
      if (bypassPermissionRoles.includes(normalizedRole) && typeof window !== 'undefined') {
        try {
          const params = new URLSearchParams(window.location.search)
          const returnTo = params.get('returnTo')
          if (returnTo && returnTo.startsWith('/') && returnTo !== '/unauthorized') {
            router.replace(returnTo)
            setLoading(false)
            return
          }
        } catch {}
      }

      if (dashboardRoles.includes(normalizedRole)) {
        router.replace('/dashboard');
        setLoading(false);
      } else {
        router.replace(userRole ? '/users' : '/dashboard');
        setLoading(false);
      }
    } catch (caughtError) {
      const loginError =
        typeof caughtError === 'object' && caughtError !== null
          ? (caughtError as { code?: string; email?: string; message?: string })
          : {};

      if (loginError.code === 'EMAIL_VERIFICATION_REQUIRED') {
        const emailForResend = loginError.email || normalizedEmail;
        setPendingVerificationEmail(emailForResend);
        setResendVerificationStatus(null);
        toast.error(loginError.message || 'Debes verificar tu correo antes de continuar.');
        setLoading(false);
        return;
      }
      setPasswordAuthError(true);
      const nextCount = (attemptState?.count ?? 0) + 1;
      const nextState: AttemptState = {
        count: nextCount,
        lastAttemptAt: Date.now(),
        lockUntil: attemptState?.lockUntil,
        forcedReset: attemptState?.forcedReset,
      };

      let feedbackMessage = loginError.message || 'Error al iniciar sesion';

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
    } catch {
      toast.error('Error al conectar con Google');
    }
  };

  const handleRecoverySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recoveryLoading) return;
    setRecoverySubmitAttempted(true);
    const trimmedEmail = recoveryEmail.trim().toLowerCase();

    if (!trimmedEmail || !emailFormatRegex.test(trimmedEmail)) {
      setRecoveryStatus({ type: 'error', message: 'Ingresa un correo electronico valido para continuar.' });
      return;
    }

    setRecoveryLoading(true);
    setRecoveryStatus(null);

    try {
      const result = await requestPasswordRecovery(trimmedEmail);
      setRecoveryStatus({ type: 'success', message: result.message });
      toast.success(result.message);
    } catch (error: unknown) {
      console.error('Error en la solicitud de recuperacion:', error);
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Ocurrio un problema al solicitar la recuperacion de la contraseña.';
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
    } catch (caughtError) {
      const resendError =
        typeof caughtError === 'object' && caughtError !== null
          ? (caughtError as { message?: string })
          : {};
      const message =
        resendError.message || 'No pudimos reenviar el correo de verificación.';
      setResendVerificationStatus({ type: 'error', message });
      toast.error(message);
    } finally {
      setResendVerificationLoading(false);
    }
  };

  const handleCapsLockDetection = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleLogin} className="flex flex-col gap-4" aria-busy={loading}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="email" className="block text-sm font-medium">
              Correo Electronico
            </Label>
            <FieldStateChip state={emailValidation} visible={emailInteracted} />
          </div>
          <Input
            id="email"
            type="email"
            placeholder="Ingresa tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`mt-1 transition-colors ${getInputToneClasses(emailInteracted ? emailValidation.tone : 'default')}`}
            disabled={loading || isForcedReset}
            aria-describedby={lockMessage ? 'login-status-message' : undefined}
            aria-invalid={emailInteracted && emailValidation.tone === 'error'}
          />
          {emailInteracted && emailValidation.message && (
            <p
              className={`mt-1.5 text-xs font-medium ${
                emailValidation.tone === 'error'
                  ? 'text-rose-600 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {emailValidation.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password" className="block text-sm font-medium">
              Contrasena
            </Label>
            <FieldStateChip state={passwordValidation} visible={passwordInteracted} />
          </div>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Ingresa tu contrasena"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordAuthError) {
                  setPasswordAuthError(false);
                }
              }}
              onKeyDown={handleCapsLockDetection}
              onKeyUp={handleCapsLockDetection}
              onFocus={(event) => {
                setPasswordFocused(true);
                setCapsLockOn(event.getModifierState?.('CapsLock') ?? false);
              }}
              onBlur={() => {
                setPasswordFocused(false);
                setCapsLockOn(false);
              }}
              required
              className={`pr-11 transition-colors ${getInputToneClasses(passwordInteracted ? passwordValidation.tone : 'default')}`}
              disabled={loading}
              aria-invalid={passwordInteracted && passwordValidation.tone === 'error'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:cursor-pointer hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordInteracted && passwordValidation.message && (
            <p
              className={`mt-1.5 text-xs font-medium ${
                passwordValidation.tone === 'error'
                  ? 'text-rose-600 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {passwordValidation.message}
            </p>
          )}
          {passwordFocused && capsLockOn && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100 to-white px-3 py-2 text-sm font-medium text-amber-900 shadow-[0_10px_30px_rgba(245,158,11,0.25)] transition-all">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-200/70 text-amber-900 shadow-inner">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <p className="leading-tight">Bloq Mayús activado</p>
                <p className="text-xs font-normal text-amber-800/80">Desactívalo si tu contraseña distingue entre mayúsculas y minúsculas.</p>
              </div>
            </div>
          )}
        </div>
        {lockMessage && (
          <div
            id="login-status-message"
            role="status"
            className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
              attemptState?.forcedReset
                ? 'border-amber-300/70 bg-amber-50/90 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
                : 'border-rose-300/70 bg-rose-50/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'
            }`}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{lockMessage}</span>
          </div>
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="recovery-email" className="text-sm font-medium">
                  Correo electronico de recuperacion
                </Label>
                <FieldStateChip state={recoveryValidation} visible={recoveryInteracted} />
              </div>
              <Input
                id="recovery-email"
                type="email"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                onBlur={() => setRecoverySubmitAttempted((prev) => prev || recoveryEmail.length > 0)}
                placeholder="correo@ejemplo.com"
                required
                disabled={recoveryLoading}
                className={`mt-1 transition-colors ${getInputToneClasses(
                  recoveryInteracted ? recoveryValidation.tone : 'default',
                )}`}
                aria-invalid={recoveryInteracted && recoveryValidation.tone === 'error'}
              />
              {recoveryInteracted && recoveryValidation.message && (
                <p
                  className={`mt-1.5 text-xs font-medium ${
                    recoveryValidation.tone === 'error'
                      ? 'text-rose-600 dark:text-rose-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {recoveryValidation.message}
                </p>
              )}
            </div>
            {recoveryStatus && (
              <div
                role={recoveryStatus.type === 'error' ? 'alert' : 'status'}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                  recoveryStatus.type === 'error'
                    ? 'border-rose-300/70 bg-rose-50/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'
                    : 'border-emerald-300/70 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                }`}
              >
                {recoveryStatus.type === 'error' ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{recoveryStatus.message}</span>
              </div>
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
