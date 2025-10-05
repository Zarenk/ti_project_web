import { io } from "socket.io-client";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const DEFAULT_DEV_BACKEND = "http://localhost:4000";

const resolvedBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV !== "production" ? DEFAULT_DEV_BACKEND : undefined);

if (!resolvedBackendUrl && process.env.NODE_ENV === "production") {
  console.warn(
    "NEXT_PUBLIC_BACKEND_URL (or BACKEND_URL) is not defined. " +
      "Realtime and API requests will fail until it is configured."
  );
}

export const BACKEND_URL = resolvedBackendUrl ?? DEFAULT_DEV_BACKEND;

const resolvedSocketUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  resolvedBackendUrl ??
  (process.env.NODE_ENV !== "production" ? DEFAULT_DEV_BACKEND : undefined);

if (!resolvedSocketUrl && process.env.NODE_ENV === "production") {
  console.warn(
    "NEXT_PUBLIC_SOCKET_URL and NEXT_PUBLIC_BACKEND_URL are missing. " +
      "Socket connections will fall back to localhost."
  );
}

export const SOCKET_URL = resolvedSocketUrl ?? DEFAULT_DEV_BACKEND;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number,
  currency: string = "USD"
): string {
  const formatted = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
  }).format(value);

  return currency === "PEN" ? formatted.replace("S/", "S/.") : formatted;
}

export async function uploadPdfToServer({
  blob,
  ruc,
  tipoComprobante,
  serie,
  correlativo,
}: {
  blob: Blob;
  ruc: number;
  tipoComprobante: string; // "boleta" | "factura"
  serie: string;
  correlativo: string;
}) {
  console.log("Enviando PDF al servidor con datos:");
  console.log({
    tipoComprobante,
    serie,
    correlativo,
    ruc,
  });
  const formData = new FormData();

  const filename = `${ruc}-${tipoComprobante === "boleta" ? "03" : "01"}-${
    serie
  }-${correlativo}.pdf`;

  formData.append("pdf", blob, filename);
  formData.append("tipo", tipoComprobante === "invoice" ? "factura" : "boleta");

  formData.forEach((value, key) => {
    console.log(`FormData -> ${key}:`, value);
  });

  const response = await fetch(`${BACKEND_URL}/api/sunat/upload-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Error al subir el PDF al servidor");
  }

  return response.json();
}

export function normalizeOptionValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = typeof value === "string" ? value : String(value);

  return stringValue.trim().toLowerCase();
}

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});

export default socket;


