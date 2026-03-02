"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { submitTrialSignup } from "../api/trial-signup"
import { StepAccount } from "./step-account"
import { StepBusiness, type VerticalKey } from "./step-business"
import { StepConfirm } from "./step-confirm"

type AccountData = { fullName: string; email: string; password: string }
type BusinessData = {
  organizationName: string
  companyName: string
  vertical: VerticalKey
}

const STEPS = [
  { number: 1, label: "Tu Cuenta" },
  { number: 2, label: "Tu Negocio" },
  { number: 3, label: "Confirmar" },
]

export function SignupWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [account, setAccount] = useState<AccountData>({
    fullName: "",
    email: "",
    password: "",
  })

  const [business, setBusiness] = useState<BusinessData>({
    organizationName: "",
    companyName: "",
    vertical: "GENERAL",
  })

  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!recaptchaToken) {
      setRecaptchaError("Confirma que no eres un robot.")
      return
    }
    setRecaptchaError(null)
    setGeneralError(null)
    setIsSubmitting(true)

    try {
      const data = await submitTrialSignup({
        fullName: account.fullName,
        email: account.email,
        password: account.password,
        organizationName: business.organizationName,
        companyName: business.companyName,
        businessVertical: business.vertical,
        recaptchaToken,
      })

      toast.success(
        data?.message ??
          "Cuenta creada correctamente. Revisa tu correo para continuar.",
      )

      setTimeout(() => {
        router.push("/portal/login?welcome=1")
      }, 1200)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar el registro"
      toast.error(message)
      setRecaptchaToken(null)

      if (message.toLowerCase().includes("correo")) {
        setStep(1)
        setGeneralError(message)
      } else if (message.toLowerCase().includes("organización")) {
        setStep(2)
        setGeneralError(message)
      } else {
        setGeneralError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-background/80 backdrop-blur-sm shadow-xl p-5 sm:p-6 space-y-5">
      {/* Progress bar */}
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 flex-shrink-0",
                step >= s.number
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {step > s.number ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.number
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:inline transition-colors",
                step >= s.number ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-1 rounded-full bg-muted ml-1 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-all duration-500 ease-out",
                    step > s.number ? "w-full" : "w-0",
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step content with slide animation */}
      <div className="relative overflow-hidden min-h-[320px]">
        <div
          key={step}
          className="animate-in fade-in slide-in-from-right-4 duration-300"
        >
          {step === 1 && (
            <StepAccount
              data={account}
              onChange={setAccount}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepBusiness
              data={business}
              onChange={setBusiness}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepConfirm
              account={account}
              business={business}
              recaptchaToken={recaptchaToken}
              onRecaptchaChange={(token) => {
                setRecaptchaToken(token)
                if (token) setRecaptchaError(null)
              }}
              onBack={() => setStep(2)}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              recaptchaError={recaptchaError}
              generalError={generalError}
            />
          )}
        </div>
      </div>
    </div>
  )
}
