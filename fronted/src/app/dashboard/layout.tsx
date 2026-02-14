import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCurrentUser } from "@/lib/current.user";
import DashboardLoading from "./loading";
import LogoutOverlay from "@/components/logout-overlay";
import { DashboardCompanyName } from "./dashboard-company-name";
import { TenantSelectionProvider } from "@/context/tenant-selection-context";
import { TenantFeaturesProvider } from "@/context/tenant-features-context";
import { ContextStatusBanner } from "@/components/context-status-banner";
import { TrialStatusBanner } from "@/components/trial-status-banner";
import { OnboardingWizardBanner } from "@/components/onboarding-wizard-banner";
import { HelpAssistantProvider } from "@/context/help-assistant-context";
import { HelpAssistant } from "@/components/help/HelpAssistant";
import { AccountingModeProvider } from "@/context/accounting-mode-context";

export const revalidate = 0;

export default async function Page({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    const hdrs = headers();
    const rawPath =
      hdrs.get("x-next-url") ||
      hdrs.get("x-original-url") ||
      hdrs.get("x-forwarded-uri") ||
      "/dashboard";
    const safePath = rawPath.startsWith("/") ? rawPath : "/dashboard";
    redirect(`/login?returnTo=${encodeURIComponent(safePath)}`);
  }

  if (user.role === "CLIENT") {
    redirect("/users");
  }

  return (
    <SidebarProvider>
      <TenantSelectionProvider>
        <TenantFeaturesProvider>
          <AccountingModeProvider>
            <HelpAssistantProvider>
              <AppSidebar />
            <SidebarInset>
              <LogoutOverlay />
              <ContextStatusBanner />
              <TrialStatusBanner
                className="px-4 pt-4"
                leading={
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarTrigger className="-ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>Abrir/Cerrar Sidebar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Separator
                      orientation="vertical"
                      className="mr-2 data-[orientation=vertical]:h-4"
                    />
                  </>
                }
              />
              <OnboardingWizardBanner />
              <Suspense fallback={<DashboardLoading />}>
                {children}
              </Suspense>
            </SidebarInset>
              <HelpAssistant />
            </HelpAssistantProvider>
          </AccountingModeProvider>
        </TenantFeaturesProvider>
      </TenantSelectionProvider>
    </SidebarProvider>
  );
}
