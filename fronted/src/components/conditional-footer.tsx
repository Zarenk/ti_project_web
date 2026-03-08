"use client";

import { usePathname } from "next/navigation";
import TemplateFooter from "@/templates/TemplateFooter";

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/unauthorized") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/google-auth") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/barcode")
  ) {
    return null;
  }
  return <TemplateFooter />;
}
