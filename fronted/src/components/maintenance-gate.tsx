"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSiteSettings } from "@/context/site-settings-context";

interface MaintenanceGateProps {
  initialEnabled: boolean;
  initialMessage: string;
  redirectTo?: string | null;
  children: ReactNode;
}

export default function MaintenanceGate({
  initialEnabled,
  initialMessage,
  redirectTo = null,
  children,
}: MaintenanceGateProps) {
  const { settings } = useSiteSettings();
  const pathname = usePathname();
  const router = useRouter();

  const enabled = settings?.maintenance.enabled ?? initialEnabled;
  const message = settings?.maintenance.message ?? initialMessage;

  useEffect(() => {
    if (!enabled || !redirectTo) {
      return;
    }

    if (pathname === redirectTo) {
      return;
    }

    router.replace(redirectTo);
  }, [enabled, pathname, redirectTo, router]);

  if (!enabled) {
    return <>{children}</>;
  }

  if (redirectTo && pathname !== redirectTo) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Estamos en mantenimiento</h1>
      <p className="max-w-xl text-base text-muted-foreground sm:text-lg">{message}</p>
    </div>
  );
}