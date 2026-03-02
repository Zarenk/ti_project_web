import { Metadata } from "next";
import { JurisprudenceClient } from "./jurisprudence-client";

export const metadata: Metadata = {
  title: "Jurisprudencia | Dashboard",
  description: "Gestión de documentos de jurisprudencia legal",
};

export default function JurisprudencePage() {
  return <JurisprudenceClient />;
}
