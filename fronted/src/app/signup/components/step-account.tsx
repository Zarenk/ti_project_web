"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { PasswordStrength } from "./password-strength"

type AccountData = {
  fullName: string
  email: string
  password: string
}

type Errors = Partial<Record<keyof AccountData, string>>

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]{8,}$/

type Props = {
  data: AccountData
  onChange: (data: AccountData) => void
  onNext: () => void
}

export function StepAccount({ data, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Errors>({})
  const [showPassword, setShowPassword] = useState(false)

  const update = (field: keyof AccountData, value: string) => {
    onChange({ ...data, [field]: value })
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const next: Errors = {}
    if (data.fullName.trim().length < 3) {
      next.fullName = "Ingresa tu nombre completo (min. 3 caracteres)."
    }
    if (!emailRegex.test(data.email.trim().toLowerCase())) {
      next.email = "Ingresa un correo valido."
    }
    if (!passwordRegex.test(data.password)) {
      next.password =
        "Debe tener 8+ caracteres, al menos una letra y un numero."
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  const inputClasses = (hasError?: boolean) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? "border-destructive focus:ring-destructive/30"
        : "border-border focus:ring-primary/30"
    }`

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Nombre completo
        </label>
        <input
          name="fullName"
          value={data.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className={inputClasses(Boolean(errors.fullName))}
          placeholder="Juan Perez Garcia"
          autoFocus
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Correo electronico
        </label>
        <input
          name="email"
          type="email"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          className={inputClasses(Boolean(errors.email))}
          placeholder="tu@empresa.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Contrasena
        </label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={data.password}
            onChange={(e) => update("password", e.target.value)}
            className={`${inputClasses(Boolean(errors.password))} pr-10`}
            placeholder="Min. 8 caracteres, letra + numero"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-2">
          <PasswordStrength password={data.password} />
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="w-full rounded-xl bg-primary py-3 text-primary-foreground font-semibold hover:bg-primary/90 transition cursor-pointer active:scale-[0.98]"
      >
        Siguiente
      </button>
    </div>
  )
}
