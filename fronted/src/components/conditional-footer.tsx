"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";

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
  return <Footer />;
}
