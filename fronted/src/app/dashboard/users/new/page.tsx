"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";

import UserForm from "./user-form";

const ALLOWED_ROLES = new Set(["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "ADMIN"]);

export default function UserNewPage(): React.ReactElement | null {
  const router = useRouter();
  const { version } = useTenantSelection();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      setChecking(true);

      try {
        const user = await getUserDataFromToken();
        const validToken = await isTokenValid();
        const role = (user?.role ?? "").toUpperCase();
        const allowed = Boolean(user) && validToken && ALLOWED_ROLES.has(role);

        if (!allowed && active) {
          setAuthorized(false);
          router.replace("/dashboard");
          return;
        }

        if (active) {
          setAuthorized(true);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [router, version]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-start justify-center p-3">
        <Card className="w-full max-w-lg sm:max-w-md md:max-w-lg lg:max-w-2xl">
          <CardHeader className="pb-2">
            <Skeleton className="mx-auto mt-5 h-7 w-40 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(6)].map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-start justify-center p-3">
      <Card className="w-full max-w-lg sm:max-w-md md:max-w-lg lg:max-w-2xl">
        <CardHeader className="pb-2 sm:pb-2">
          <CardTitle className="pt-5 text-center text-xl font-bold">
            Crear Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm />
        </CardContent>
      </Card>
    </div>
  );
}
