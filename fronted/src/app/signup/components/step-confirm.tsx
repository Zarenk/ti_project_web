"use client"

import { useRef } from "react"
import { Loader2, CheckCircle } from "lucide-react"
import ReCAPTCHA from "react-google-recaptcha"
import type { VerticalKey } from "./step-business"

const VERTICAL_LABELS: Record<VerticalKey, string> = {
  GENERAL: "General",
  RETAIL: "Comercio / Tienda",
  SERVICES: "Servicios",
  MANUFACTURING: "Manufactura",
  COMPUTERS: "Computacion",
  RESTAURANTS: "Restaurantes",
  LAW_FIRM: "Estudio Legal",
  GYM: "Gimnasio",
}

type Props = {
  account: { fullName: string; email: string }
  business: { organizationName: string; companyName: string; vertical: VerticalKey }
  recaptchaToken: string | null
  onRecaptchaChange: (token: string | null) => void
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
  recaptchaError: string | null
  generalError: string | null
}

export function StepConfirm({
  account,
  business,
  recaptchaToken,
  onRecaptchaChange,
  onBack,
  onSubmit,
  isSubmitting,
  recaptchaError,
  generalError,
}: Props) {
  const recaptchaRef = useRef<ReCAPTCHA | null>(null)
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  const rows = [
    { label: "Nombre", value: account.fullName },
    { label: "Email", value: account.email },
    { label: "Organizacion", value: business.organizationName },
    { label: "Empresa", value: business.companyName },
    { label: "Tipo de negocio", value: VERTICAL_LABELS[business.vertical] },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-medium text-primary mb-3">
          Revisa tus datos antes de crear la cuenta
        </p>
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground w-24 flex-shrink-0">
              {row.label}:
            </span>
            <span className="font-medium text-foreground break-words">{row.value}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Al crear tu cuenta obtendras un periodo de prueba gratuito. Sin tarjeta
        de credito.
      </p>

      <div className="flex justify-center">
        {recaptchaSiteKey ? (
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={recaptchaSiteKey}
            onChange={(token: string | null) => onRecaptchaChange(token)}
            theme="light"
          />
        ) : (
          <p className="text-sm text-destructive">
            Clave de reCAPTCHA no configurada
          </p>
        )}
      </div>

      {recaptchaError && (
        <p className="text-sm text-destructive text-center">{recaptchaError}</p>
      )}
      {generalError && (
        <p className="text-sm text-destructive text-center">{generalError}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground hover:bg-muted transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-primary-foreground font-semibold hover:bg-primary/90 transition cursor-pointer active:scale-[0.98] disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creando cuenta...
            </>
          ) : (
            "Crear cuenta demo"
          )}
        </button>
      </div>
    </div>
  )
}
