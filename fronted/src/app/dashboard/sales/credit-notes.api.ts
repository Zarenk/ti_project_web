import { BACKEND_URL, uploadPdfToServer } from "@/lib/utils";
import { authFetch } from "@/utils/auth-fetch";
import { getCompanyDetail } from "../tenancy/tenancy.api";
import type { Sale } from "./columns";
import type { CreditNoteDocumentData } from "./components/pdf/CreditNoteDocument";

export interface CreditNote {
  id: number;
  organizationId: number;
  companyId: number;
  originalSaleId: number;
  originalInvoiceId: number;
  serie: string;
  correlativo: string;
  motivo: string;
  codigoMotivo: string;
  subtotal: number;
  igv: number;
  total: number;
  status: string;
  fechaEmision: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: number | null;
  originalSale?: { id: number; total: number; createdAt: string };
  originalInvoice?: {
    serie: string;
    nroCorrelativo: string;
    tipoComprobante: string;
  };
  sunatResult?: {
    status: string;
    cdrCode: string;
    cdrDescription: string;
  } | null;
}

export interface CreateCreditNotePayload {
  saleId: number;
  motivo: string;
  codigoMotivo?: string;
  fechaEmision?: string;
}

export async function createCreditNote(
  data: CreateCreditNotePayload,
): Promise<CreditNote> {
  const response = await authFetch(`${BACKEND_URL}/api/credit-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Error desconocido" }));
    const errorMessage = errorData.message
      ? Array.isArray(errorData.message)
        ? errorData.message.join(", ")
        : errorData.message
      : "Error al emitir la nota de crédito";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getCreditNotes(): Promise<CreditNote[]> {
  const response = await authFetch(`${BACKEND_URL}/api/credit-notes`);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Error desconocido" }));
    throw new Error(errorData.message ?? "Error al obtener notas de crédito");
  }

  return response.json();
}

/**
 * Build a CreditNoteDocumentData object from the credit note result + original sale.
 * Used by the dialog to generate and upload the PDF after creation.
 */
export function buildCreditNoteDocumentData(
  creditNote: CreditNote,
  sale: Sale,
  companyInfo: {
    ruc: string;
    razonSocial: string;
    direccion?: string;
    telefono?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  },
): CreditNoteDocumentData {
  const invoice = sale.invoices;
  const tipoOriginal =
    (invoice?.tipoComprobante ?? "").toUpperCase() === "FACTURA" ? "01" : "03";

  return {
    serie: creditNote.serie,
    correlativo: creditNote.correlativo,
    fechaEmision: creditNote.fechaEmision ?? creditNote.createdAt,
    tipoMoneda: invoice?.tipoMoneda ?? "PEN",
    emisor: {
      ruc: companyInfo.ruc,
      razonSocial: companyInfo.razonSocial,
      direccion: companyInfo.direccion,
      telefono: companyInfo.telefono,
      logoUrl: companyInfo.logoUrl,
      primaryColor: companyInfo.primaryColor,
      secondaryColor: companyInfo.secondaryColor,
    },
    cliente: {
      tipoDocumento: (() => {
        const t = (sale.client?.type ?? "").toUpperCase();
        if (t.includes("RUC")) return "6";
        if (t.includes("DNI")) return "1";
        if (t.includes("CE") || t.includes("EXTRANJER")) return "4";
        if (t.includes("PASAPORTE")) return "7";
        // Fallback: infer from document length
        const doc = sale.client?.documentNumber ?? sale.client?.ruc ?? sale.client?.dni ?? "";
        if (doc.length === 11) return "6"; // RUC
        if (doc.length === 8) return "1"; // DNI
        return "0";
      })(),
      numeroDocumento:
        sale.client?.documentNumber ?? sale.client?.ruc ?? sale.client?.dni ?? "00000000",
      razonSocial: sale.client?.name ?? "CLIENTE",
      direccion: "",
    },
    documentoModificado: {
      tipo: tipoOriginal,
      serie: invoice?.serie ?? "",
      correlativo: invoice?.nroCorrelativo ?? "",
    },
    motivo: creditNote.motivo,
    codigoMotivo: creditNote.codigoMotivo,
    items: (sale.details ?? []).map((d) => ({
      descripcion: d.product?.name ?? d.productName ?? "Producto",
      cantidad: d.quantity ?? 0,
      precioUnitario: d.price ?? 0,
      total: (d.quantity ?? 0) * (d.price ?? 0),
      unitCode: "NIU",
      series:
        d.series
          ?.map((s) => (typeof s === "string" ? s : s?.number ?? ""))
          .filter(Boolean) ?? [],
    })),
    subtotal: creditNote.subtotal,
    igv: creditNote.igv,
    total: creditNote.total,
  };
}

/**
 * Generate the credit note PDF blob and upload it to the server.
 * Fetches company info automatically using the creditNote.companyId.
 */
export async function generateAndUploadCreditNotePdf(params: {
  creditNote: CreditNote;
  sale: Sale;
}): Promise<void> {
  const { creditNote, sale } = params;

  // Fetch company details for the PDF header
  const company = await getCompanyDetail(creditNote.companyId);
  if (!company) {
    throw new Error("No se pudo obtener la información de la empresa.");
  }

  const backendUrl =
    (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const rawLogo = company.logoUrl?.trim();
  const resolvedLogoUrl = rawLogo
    ? /^https?:\/\//i.test(rawLogo)
      ? rawLogo
      : `${backendUrl}/${rawLogo.replace(/^\/+/, "")}`
    : undefined;

  const companyInfo = {
    ruc: company.sunatRuc ?? company.taxId ?? "",
    razonSocial: company.sunatBusinessName ?? company.name ?? "",
    direccion: company.sunatAddress ?? undefined,
    telefono: company.sunatPhone ?? undefined,
    logoUrl: resolvedLogoUrl,
    primaryColor: company.primaryColor ?? undefined,
    secondaryColor: company.secondaryColor ?? undefined,
  };

  // Dynamic imports to avoid bundling PDF renderer in the main chunk
  const [{ pdf }, { CreditNoteDocument }, { numeroALetrasCustom }, QRCode] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("./components/pdf/CreditNoteDocument"),
      import("./components/utils/numeros-a-letras"),
      import("qrcode"),
    ]);

  const docData = buildCreditNoteDocumentData(creditNote, sale, companyInfo);
  const importeEnLetras = numeroALetrasCustom(creditNote.total, "PEN");

  // Build QR data
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const qrData = `${baseUrl}/verify/nc/${creditNote.serie}-${creditNote.correlativo}`;
  const qrCode = await QRCode.toDataURL(qrData);

  // Generate PDF blob
  const element = CreditNoteDocument({ data: docData, qrCode, importeEnLetras });
  const blob = await pdf(element).toBlob();

  // Open in new window
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl);

  // Upload to server
  await uploadPdfToServer({
    blob,
    ruc: companyInfo.ruc,
    tipoComprobante: "nota_credito",
    serie: creditNote.serie,
    correlativo: creditNote.correlativo,
  });
}
