"use client";

import { authFetch } from "@/utils/auth-fetch";

// ── Types ─────────────────────────────────────────────────────

export interface ShippingGuide {
  id: number;
  serie: string;
  correlativo: string;
  motivoTraslado: string;
  fechaTraslado: string;
  puntoPartida: string;
  puntoLlegada: string;
  transportistaTipoDocumento: string;
  transportistaNumeroDocumento: string;
  transportistaRazonSocial: string;
  transportistaNumeroPlaca: string;
  destinatarioTipoDocumento: string;
  destinatarioNumeroDocumento: string;
  destinatarioRazonSocial: string;
  xmlName: string | null;
  zipName: string | null;
  cdrAceptado: boolean;
  cdrCode: string | null;
  cdrDescription: string | null;
  organizationId: number | null;
  companyId: number | null;
  guideData: CreateGuidePayload | null;
  puntoPartidaDireccion: string | null;
  puntoPartidaUbigeo: string | null;
  puntoLlegadaDireccion: string | null;
  puntoLlegadaUbigeo: string | null;
  pesoBrutoTotal: number | null;
  pesoBrutoUnidad: string | null;
  modalidadTraslado: string | null;
  remitenteRuc: string | null;
  remitenteRazonSocial: string | null;
  status: string;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
}

export interface StoreTransfer {
  id: number;
  sourceStoreId: number;
  destinationStoreId: number;
  productId: number;
  quantity: number;
  serials: string[];
  description: string | null;
  createdAt: string;
  organizationId: number | null;
  shippingGuideId: number | null;
  product: { id: number; name: string; barcode: string | null };
  sourceStore: { id: number; name: string };
  destinationStore: { id: number; name: string };
  shippingGuide: {
    id: number;
    serie: string;
    correlativo: string;
    motivoTraslado: string;
    cdrAceptado: boolean;
    status: string;
    puntoPartida: string;
    puntoLlegada: string;
    fechaTraslado: string;
  } | null;
}

export interface CreateGuidePayload {
  serie?: string;
  correlativo?: string;
  tipoDocumentoRemitente?: string;
  numeroDocumentoRemitente?: string;
  razonSocialRemitente?: string;
  puntoPartida: string;
  puntoLlegada: string;
  motivoTraslado: string;
  motivoTrasladoCodigo?: string;
  fechaTraslado: string;
  fechaEmision?: string;
  modalidadTraslado?: string;
  pesoBrutoTotal?: number;
  pesoBrutoUnidad?: string;
  puntoPartidaDireccion?: string;
  puntoPartidaUbigeo?: string;
  puntoPartidaDepartamento?: string;
  puntoPartidaProvincia?: string;
  puntoPartidaDistrito?: string;
  puntoLlegadaDireccion?: string;
  puntoLlegadaUbigeo?: string;
  puntoLlegadaDepartamento?: string;
  puntoLlegadaProvincia?: string;
  puntoLlegadaDistrito?: string;
  transportista: {
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial: string;
    numeroPlaca?: string;
  };
  destinatario: {
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial: string;
  };
  items: {
    codigo: string;
    descripcion: string;
    cantidad: number;
    unidadMedida: string;
  }[];
  // Inter-store transfer fields
  isInterStore?: boolean;
  sourceStoreId?: number;
  destinationStoreId?: number;
  userId?: number;
  transferItems?: {
    productId: number;
    quantity: number;
    serials?: string[];
  }[];
}

// ── API Functions ─────────────────────────────────────────────

export async function fetchShippingGuides(): Promise<ShippingGuide[]> {
  const res = await authFetch("/guide/shipping-guides");
  if (!res.ok) throw new Error("Error al cargar guías de remisión");
  return res.json();
}

export async function createShippingGuide(
  data: CreateGuidePayload,
): Promise<any> {
  const res = await authFetch("/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al crear guía de remisión");
  }
  return res.json();
}

export async function validateShippingGuide(
  data: CreateGuidePayload,
): Promise<any> {
  const res = await authFetch("/guide/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al validar guía");
  }
  return res.json();
}

export async function getGuideStatus(
  id: number,
): Promise<{ estadoSunat: string; cdrCode: string; cdrDescription: string }> {
  const res = await authFetch(`/guide/${id}/status`);
  if (!res.ok) throw new Error("Error al obtener estado de guía");
  return res.json();
}

export async function refreshGuideStatus(
  id: number,
): Promise<{
  message: string;
  estadoSunat?: string;
  cdrCode?: string;
  cdrDescription?: string;
  guide?: ShippingGuide;
}> {
  const res = await authFetch(`/guide/${id}/refresh-status`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al consultar estado SUNAT");
  }
  return res.json();
}

export async function downloadGuideFile(
  id: number,
  type: "xml" | "zip" | "cdr",
): Promise<Blob> {
  const res = await authFetch(`/guide/${id}/files/${type}`);
  if (!res.ok) throw new Error(`Error al descargar archivo ${type}`);
  return res.blob();
}

export async function deleteGuide(id: number): Promise<{ message: string }> {
  const res = await authFetch(`/guide/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al eliminar guía");
  }
  return res.json();
}

export async function voidGuide(
  id: number,
  reason?: string,
): Promise<ShippingGuide> {
  const res = await authFetch(`/guide/${id}/void`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al anular guía");
  }
  return res.json();
}

export async function fetchTransfers(
  page = 1,
  pageSize = 50,
): Promise<{
  items: StoreTransfer[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const res = await authFetch(
    `/inventory/transfers?page=${page}&pageSize=${pageSize}`,
  );
  if (!res.ok) throw new Error("Error al cargar traslados");
  return res.json();
}
