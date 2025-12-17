const backendBase =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ||
  'http://localhost:4000';

const publicSignupBase = `${backendBase}/api/public/signup`;

export async function resendVerificationEmail(email: string) {
  const response = await fetch(`${publicSignupBase}/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? 'No se pudo reenviar el correo.');
  }
  return data;
}

export async function verifySignupToken(token: string) {
  const response = await fetch(`${publicSignupBase}/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? 'No se pudo verificar el correo.');
  }
  return data;
}
