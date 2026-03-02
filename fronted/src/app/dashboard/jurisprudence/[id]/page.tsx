import { Metadata } from "next";
import { JurisprudenceDetailClient } from "./detail-client";

export const metadata: Metadata = {
  title: "Detalle de Documento | Jurisprudencia",
  description: "Detalle de documento de jurisprudencia",
};

export default function JurisprudenceDetailPage() {
  return <JurisprudenceDetailClient />;
}
