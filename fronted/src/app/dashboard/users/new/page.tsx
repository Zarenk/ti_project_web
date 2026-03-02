"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";

import UserForm from "./user-form";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { USER_FORM_GUIDE_STEPS } from "./user-form-guide-steps";

const ALLOWED_ROLES = new Set(["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "ADMIN"]);

export default function UserNewPage(): React.ReactElement | null {
  const router = useRouter();
  const { selection } = useTenantSelection();
  const [authorized, setAuthorized] = useState(false);

  const { isLoading: checking } = useQuery({
    queryKey: ["tenant", selection.orgId, selection.companyId, "userNewPageAuth"],
    queryFn: async () => {
      const user = await getUserDataFromToken();
      const validToken = await isTokenValid();
      const role = (user?.role ?? "").toUpperCase();
      const allowed = Boolean(user) && validToken && ALLOWED_ROLES.has(role);

      if (!allowed) {
        setAuthorized(false);
        router.replace("/dashboard");
        return { authorized: false };
      }

      setAuthorized(true);
      return { authorized: true };
    },
    enabled: selection.orgId !== null,
  });

  if (checking) {
    return (
      <div className="flex min-h-screen items-start justify-center p-3">
        <Card className="w-full max-w-lg sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
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
      <Card className="w-full max-w-lg sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
        <CardHeader className="pb-2 sm:pb-2">
          <div className="flex items-center justify-center gap-2 pt-5">
            <CardTitle className="text-center text-xl font-bold">
              Crear Usuario
            </CardTitle>
            <PageGuideButton steps={USER_FORM_GUIDE_STEPS} tooltipLabel="Guía del formulario" />
          </div>
        </CardHeader>
        <CardContent>
          <UserForm />
        </CardContent>
      </Card>
    </div>
  );
}
