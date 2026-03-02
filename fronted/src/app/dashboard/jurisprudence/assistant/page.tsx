import { Metadata } from "next"
import { JurisprudenceAssistantClient } from "./assistant-client"

export const metadata: Metadata = {
  title: "Asistente de Jurisprudencia | Dashboard",
  description: "Consulta inteligente de jurisprudencia con IA",
}

export default function JurisprudenceAssistantPage() {
  return <JurisprudenceAssistantClient />
}
