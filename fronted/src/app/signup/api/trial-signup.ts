export type TrialSignupPayload = {
  fullName: string;
  email: string;
  password: string;
  organizationName: string;
  companyName: string;
  industry: string;
  recaptchaToken: string;
};

export async function submitTrialSignup(payload: TrialSignupPayload) {
  const backendBase =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
    "http://localhost:4000";

  const response = await fetch(`${backendBase}/api/public/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message ?? "No se pudo registrar la cuenta");
  }

  return data;
}

