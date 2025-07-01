export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// lib/socket.ts
import { io } from "socket.io-client";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(value);
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
  console.log("📦 Enviando PDF al servidor con datos:");
  console.log({
    tipoComprobante,
    serie,
    correlativo,
    ruc,
  });
  const formData = new FormData();
  

  const filename = `${ruc}-${tipoComprobante === 'boleta' ? '03' : '01'}-${serie}-${correlativo}.pdf`;

  formData.append('pdf', blob, filename);
  formData.append('tipo', tipoComprobante === 'invoice' ? 'factura' : 'boleta');

  formData.forEach((value, key) => {
    console.log(`🧾 FormData -> ${key}:`, value);
  });

  const response = await fetch(`${BACKEND_URL}/api/sunat/upload-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Error al subir el PDF al servidor');
  }

  return response.json(); // { message: 'PDF guardado correctamente en el servidor.' }
}

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
  transports: ["websocket"],
});

export default socket;