import { BACKEND_URL } from "@/lib/utils";

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
  const response = await fetch(`${BACKEND_URL}/api/public/signup`, {
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

