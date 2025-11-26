"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";

const initialState = {
  fullName: "",
  email: "",
  password: "",
  organizationName: "",
  companyName: "",
  industry: "",
};

export function TrialSignupSection() {
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recaptchaSiteKey) {
      toast.error("Falta configurar la clave de reCAPTCHA");
      return;
    }
    if (!recaptchaToken) {
      toast.error("Confirma que no eres un robot");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/public/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recaptchaToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "No se pudo registrar la cuenta");
      }
      toast.success(
        data?.message ??
          "Cuenta creada correctamente. Revisa tu correo para continuar.",
      );
      setForm(initialState);
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo completar el registro",
      );
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
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
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
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Industria
              </label>
              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-900"
              >
                <option value="">Selecciona una industria</option>
                <option value="retail">Retail / Tienda</option>
                <option value="services">Servicios</option>
                <option value="manufacturing">Manufactura</option>
                <option value="distribution">Distribución</option>
              </select>
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
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
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
                className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
          <div className="flex justify-center">
            {recaptchaSiteKey ? (
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={recaptchaSiteKey}
                onChange={(token) => setRecaptchaToken(token)}
                theme="dark"
              />
            ) : (
              <p className="text-sm text-rose-200">
                Clave de reCAPTCHA no configurada
              </p>
            )}
          </div>
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
