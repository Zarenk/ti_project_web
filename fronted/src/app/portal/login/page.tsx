"use client";

import LoginForm from "@/app/login/login-form";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isTokenValid, getUserDataFromToken } from "@/lib/auth";
import Link from "next/link";

export default function PortalLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams?.get("welcome") === "1";

  useEffect(() => {
    async function checkSession() {
      if (await isTokenValid()) {
        const data = await getUserDataFromToken();
        if (data?.role && ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "ADMIN", "EMPLOYEE"].includes(data.role)) {
          router.replace("/dashboard");
        } else {
          router.replace("/users");
        }
      }
    }
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border/40 bg-background/80 backdrop-blur shadow-2xl">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm uppercase tracking-wide text-primary font-semibold">Accede a tu cuenta</p>
            <h1 className="text-3xl font-bold">Portal de clientes</h1>
            <p className="text-sm text-foreground/70">
              Ingresa con las credenciales que generaste durante tu prueba o suscripción.
            </p>
          </div>
          {showWelcome && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 px-3 py-2 text-sm text-center">
              Hemos creado tu entorno demo. Revisa tu correo y accede con las credenciales enviadas.
            </div>
          )}
          <LoginForm />
          <div className="pt-4 text-center space-y-2 text-sm text-foreground/70">
            <p>
              ¿Todavía no tienes cuenta?{" "}
              <a href="/signup#signup-form" className="text-primary font-semibold hover:underline">
                Comienza tu demo gratuita
              </a>
            </p>
            <p>
              <Link href="/signup" className="hover:underline font-semibold">
                Volver al landing
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
