"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) {
    return null;
  }
  return <Footer />;
}