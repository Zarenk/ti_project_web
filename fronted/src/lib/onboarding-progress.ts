import { authFetch } from "@/utils/auth-fetch"
import type { DemoDataStatus, OnboardingProgress, OnboardingStepKey } from "@/types/onboarding"

interface UpdateStepPayload {
  step: OnboardingStepKey
  completed?: boolean
  payload?: Record<string, any> | null
}

function ensureOk(res: Response): Response {
  if (!res.ok) {
    throw new Error(`Error ${res.status} al llamar a ${res.url}`)
  }
  return res
}

export async function fetchOnboardingProgress(): Promise<OnboardingProgress> {
  const res = ensureOk(await authFetch("/onboarding/progress", { cache: "no-store" }))
  return res.json()
}

export async function updateOnboardingStep(payload: UpdateStepPayload): Promise<OnboardingProgress> {
  const res = ensureOk(
    await authFetch("/onboarding/step", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  )
  return res.json()
}

export async function updateDemoStatus(status: DemoDataStatus, note?: string): Promise<OnboardingProgress> {
  const res = ensureOk(
    await authFetch("/onboarding/demo/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    }),
  )
  return res.json()
}

export async function clearDemoData(reason?: string): Promise<OnboardingProgress> {
  const res = ensureOk(
    await authFetch("/onboarding/demo/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),
  )
  return res.json()
}

export async function seedDemoData(industry?: string): Promise<OnboardingProgress> {
  const res = ensureOk(
    await authFetch("/onboarding/demo/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(industry ? { industry } : {}),
    }),
  )
  return res.json()
}

export async function dismissOnboardingBanner(): Promise<OnboardingProgress> {
  const res = ensureOk(
    await authFetch("/onboarding/banner/dismiss", {
      method: "POST",
    }),
  )
  return res.json()
}
