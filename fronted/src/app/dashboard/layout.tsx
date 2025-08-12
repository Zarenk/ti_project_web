import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";

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

export const revalidate = 0;

export default async function Page({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/unauthorized");
  }

  if (user.role === "CLIENT") {
    redirect("/users");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex items-center gap-2 px-4 py-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="-ml-1"/>
              </TooltipTrigger>
              <TooltipContent>
                Abrir/Cerrar Sidebar
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        <Separator
         orientation="vertical"
         className="mr-2 data-[orientation=vertical]:h-4"
        />
        TI Empresa
        </div>
        <Suspense fallback={<DashboardLoading />}>
          {children}
        </Suspense>   
      </SidebarInset>
    </SidebarProvider>
  );
}