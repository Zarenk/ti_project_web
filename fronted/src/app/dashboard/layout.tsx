"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Page({children}: {children: React.ReactNode}) {
  
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

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
        {children}       
      </SidebarInset>
    </SidebarProvider>
  );
}