"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { verifySignupToken } from "@/app/signup/api/verification";

type Status = "idle" | "success" | "error";

export default function VerifyPortalPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params?.get("token");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Procesando verificación...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("El enlace de verificación es inválido.");
      return;
    }

    let active = true;
    setStatus("idle");
    setMessage("Confirmando tu correo, por favor espera...");

    verifySignupToken(token)
      .then((data) => {
        if (!active) return;
        setStatus("success");
        setMessage(
          data?.message ||
            "Tu correo fue verificado correctamente. Ya puedes iniciar sesión."
        );
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(
          error?.message ||
            "No se pudo verificar el enlace. Solicita uno nuevo e inténtalo otra vez."
        );
      });

    return () => {
      active = false;
    };
  }, [token]);

  const icon =
    status === "success"
      ? "✅"
      : status === "error"
        ? "⚠️"
        : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border/40 bg-background/80 backdrop-blur shadow-2xl p-8 space-y-6 text-center">
        <p className="text-sm uppercase tracking-wide text-primary font-semibold">
          Verificación de correo
        </p>
        <h1 className="text-3xl font-bold">Portal de clientes</h1>
        <div className="flex flex-col items-center gap-3 text-foreground/80">
          {status === "idle" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
          {icon && <span className="text-4xl">{icon}</span>}
          <p>{message}</p>
        </div>
        {status !== "idle" && (
          <div className="space-y-2">
            <Link
              href="/portal/login"
              className="inline-flex w-full justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Ir al portal
            </Link>
            {status === "error" && (
              <button
                type="button"
                onClick={() => router.replace("/portal/login")}
                className="w-full text-sm text-muted-foreground hover:underline"
              >
                ¿Necesitas reenviar el enlace?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
