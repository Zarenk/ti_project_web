"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import { useRouter } from "next/navigation";
import { submitTrialSignup } from "@/app/signup/api/trial-signup";

const initialState = {
  fullName: "",
  email: "",
  password: "",
  organizationName: "",
  companyName: "",
  industry: "",
};

type SignupField = keyof typeof initialState;
type FormErrors = Partial<
  Record<SignupField | "recaptcha" | "general", string>
>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]{8,}$/;

export function TrialSignupSection() {
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const router = useRouter();

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (form.fullName.trim().length < 3) {
      nextErrors.fullName = "Ingresa tu nombre completo.";
    }

    if (!emailRegex.test(form.email.trim().toLowerCase())) {
      nextErrors.email = "Ingresa un correo válido.";
    }

    if (!passwordRegex.test(form.password)) {
      nextErrors.password =
        "Debe tener 8 caracteres, al menos una letra y un número.";
    }

    if (!form.industry) {
      nextErrors.industry = "Selecciona una industria.";
    }

    if (form.organizationName.trim().length < 3) {
      nextErrors.organizationName =
        "La organización debe tener al menos 3 caracteres.";
    }

    if (form.companyName.trim().length < 3) {
      nextErrors.companyName =
        "El nombre comercial debe tener al menos 3 caracteres.";
    }

    if (!recaptchaToken) {
      nextErrors.recaptcha = "Confirma que no eres un robot.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const inputClasses = (hasError?: boolean) =>
    `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      hasError
        ? "border-rose-300 bg-white/5 focus:ring-rose-300"
        : "border-white/30 bg-white/10 focus:ring-sky-400"
    }`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recaptchaSiteKey) {
      toast.error("Falta configurar la clave de reCAPTCHA");
      return;
    }
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const token = recaptchaToken as string;
      const data = await submitTrialSignup({
        ...form,
        recaptchaToken: token,
      });

      toast.success(
        data?.message ??
          "Cuenta creada correctamente. Revisa tu correo para continuar.",
      );
      setForm(initialState);
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      setErrors({});
      setTimeout(() => {
        router.push("/portal/login?welcome=1");
      }, 1200);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar el registro";
      toast.error(message);
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
      if (message.toLowerCase().includes("correo")) {
        setErrors((prev) => ({ ...prev, email: message }));
      } else if (message.toLowerCase().includes("organización")) {
        setErrors((prev) => ({ ...prev, organizationName: message }));
      } else {
        setErrors((prev) => ({ ...prev, general: message }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="gsap-section bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 text-white py-16">
      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sky-300 font-semibold uppercase tracking-wide mb-2">
            Comienza tu prueba gratuita
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Crea tu cuenta y obtén un entorno demo de 14 días
          </h2>
          <p className="text-slate-200 text-lg leading-relaxed">
            Configuramos automáticamente tu organización, empresa y datos demo
            para que puedas probar todas las funcionalidades antes de decidir.
            Sin tarjetas de crédito, cancela en cualquier momento.
          </p>
          <ul className="mt-6 space-y-2 text-slate-200">
            <li>• Datos demo por industria para que veas reportes reales.</li>
            <li>• Invitación inmediata para tu equipo.</li>
            <li>• Recordatorios antes de que finalice el periodo de prueba.</li>
          </ul>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre completo
              </label>
              <input
                name="fullName"
                required
                value={form.fullName}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.fullName))}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-rose-200">{errors.fullName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.email))}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-200">{errors.email}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.password))}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-rose-200">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Industria
              </label>
              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className={`${inputClasses(Boolean(errors.industry))} text-slate-900`}
                aria-invalid={Boolean(errors.industry)}
              >
                <option value="">Selecciona una industria</option>
                <option value="retail">Retail / Tienda</option>
                <option value="services">Servicios</option>
                <option value="manufacturing">Manufactura</option>
                <option value="distribution">Distribución</option>
              </select>
              {errors.industry && (
                <p className="mt-1 text-xs text-rose-200">{errors.industry}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre de la organización
              </label>
              <input
                name="organizationName"
                required
                value={form.organizationName}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.organizationName))}
                aria-invalid={Boolean(errors.organizationName)}
              />
              {errors.organizationName && (
                <p className="mt-1 text-xs text-rose-200">
                  {errors.organizationName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre comercial
              </label>
              <input
                name="companyName"
                required
                value={form.companyName}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.companyName))}
                aria-invalid={Boolean(errors.companyName)}
              />
              {errors.companyName && (
                <p className="mt-1 text-xs text-rose-200">
                  {errors.companyName}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-center">
            {recaptchaSiteKey ? (
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={recaptchaSiteKey}
                onChange={(token:any) => {
                  setRecaptchaToken(token);
                  setErrors((prev) => ({ ...prev, recaptcha: undefined }));
                }}
                theme="dark"
              />
            ) : (
              <p className="text-sm text-rose-200">
                Clave de reCAPTCHA no configurada
              </p>
            )}
          </div>
          {errors.recaptcha && (
            <p className="text-sm text-rose-200 text-center">
              {errors.recaptcha}
            </p>
          )}
          {errors.general && (
            <p className="text-sm text-rose-200 text-center">
              {errors.general}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-400 py-3 text-slate-900 font-semibold hover:bg-sky-300 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creando cuenta...
              </>
            ) : (
              "Crear cuenta demo"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
