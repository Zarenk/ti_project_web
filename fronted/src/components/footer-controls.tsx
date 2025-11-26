"use client";

import { usePathname } from "next/navigation";
import WhatsappButton from "@/components/whatsapp-button";
import ChatButton from "@/components/ChatButton";
import ConditionalFooter from "@/components/conditional-footer";

export default function FooterControls() {
  const pathname = usePathname();
  if (pathname.startsWith("/signup")) {
    return <ConditionalFooter />;
  }
  return (
    <>
      <WhatsappButton />
      <ChatButton />
      <ConditionalFooter />
    </>
  );
}
