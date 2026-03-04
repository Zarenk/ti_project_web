import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

import { BACKEND_URL } from "@/lib/utils";
import { resolveLogoSrc, CompanyLogo } from "@/app/dashboard/sales/components/pdf/pdf-logo-helper";

// ── Types ────────────────────────────────────────────────────────
export interface GuideDocumentData {
  serie: string;
  correlativo: string;
  fechaTraslado: string;
  fechaEmision?: string;
  motivoTraslado: string;
  modalidadTraslado?: string;

  // Remitente
  remitenteRuc: string;
  remitenteRazonSocial: string;
  remitenteAddress?: string;
  remitentePhone?: string;
  remitenteLogo?: string | null;

  // Destinatario
  destinatarioTipoDocumento: string;
  destinatarioNumeroDocumento: string;
  destinatarioRazonSocial: string;

  // Transportista
  transportistaTipoDocumento: string;
  transportistaNumeroDocumento: string;
  transportistaRazonSocial: string;
  transportistaNumeroPlaca: string;

  // Route
  puntoPartida: string;
  puntoPartidaDireccion?: string;
  puntoPartidaUbigeo?: string;
  puntoLlegada: string;
  puntoLlegadaDireccion?: string;
  puntoLlegadaUbigeo?: string;

  // Weight
  pesoBrutoTotal?: number;
  pesoBrutoUnidad?: string;

  // Items
  items: {
    codigo: string;
    descripcion: string;
    cantidad: number;
    unidadMedida: string;
    serials?: string[];
  }[];

  // Observations
  observaciones?: string;

  // SUNAT
  cdrAceptado?: boolean;
  cdrCode?: string | null;
  cdrDescription?: string | null;

  // QR Code (data URL from qrcode library)
  qrDataUrl?: string;

  // Branding
  primaryColor?: string;
  secondaryColor?: string;
}

// ── Motivo labels ────────────────────────────────────────────────
const MOTIVO_MAP: Record<string, string> = {
  "01": "Venta",
  "02": "Compra",
  "03": "Venta con entrega a terceros",
  "04": "Traslado entre establecimientos",
  "05": "Consignacion",
  "06": "Devolucion",
  "07": "Recojo de bienes transformados",
  "08": "Importacion",
  "09": "Exportacion",
  "13": "Otros",
  "14": "Venta sujeta a confirmacion",
  "17": "Traslado de bienes para transformacion",
  "18": "Traslado emisor itinerante",
  "19": "Traslado zona primaria",
};

const DOC_TYPE_MAP: Record<string, string> = {
  "1": "DNI",
  "4": "Carnet de Extranjeria",
  "6": "RUC",
  "7": "Pasaporte",
  "A": "Cedula Diplomatica",
};

const MODALIDAD_MAP: Record<string, string> = {
  "01": "Transporte publico",
  "02": "Transporte privado",
};

const UM_MAP: Record<string, string> = {
  NIU: "Unidad",
  KGM: "Kilogramos",
  LTR: "Litros",
  MTR: "Metros",
  BX: "Cajas",
};

// ── Helpers ──────────────────────────────────────────────────────
// resolveLogoSrc imported from pdf-logo-helper

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getMotivo(code: string) {
  return MOTIVO_MAP[code] || code;
}

function getDocType(code: string) {
  return DOC_TYPE_MAP[code] || code;
}

function getModalidad(code?: string) {
  if (!code) return "—";
  return MODALIDAD_MAP[code] || code;
}

function getUM(code: string) {
  return UM_MAP[code] || code;
}

// ── Colors ───────────────────────────────────────────────────────
const DEFAULT_PRIMARY = "#0B2B66";
const DEFAULT_SECONDARY = "#0F3B8C";
const ACCENT_LIGHT = "#EBF0FA";
const BORDER_COLOR = "#CBD5E1";
const TEXT_MUTED = "#64748B";

// ── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1E293B",
  },

  // ─ Header ─────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: `2px solid ${DEFAULT_PRIMARY}`,
  },
  headerLeft: {
    width: "55%",
    gap: 2,
  },
  headerRight: {
    width: "42%",
    alignItems: "center",
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0F172A",
  },
  companyInfo: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 1,
  },

  // ─ Document box ───────────────────────────────
  docBox: {
    border: `1.5px solid ${DEFAULT_PRIMARY}`,
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
    width: "100%",
  },
  docTitleBar: {
    backgroundColor: DEFAULT_PRIMARY,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 6,
    width: "100%",
    alignItems: "center",
  },
  docTitle: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  docRuc: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  docNumber: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // ─ Section ────────────────────────────────────
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#FFFFFF",
    backgroundColor: DEFAULT_SECONDARY,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionBox: {
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },

  // ─ Key-value rows ─────────────────────────────
  row: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-start",
  },
  label: {
    width: 110,
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
  },
  colon: {
    width: 8,
    textAlign: "center",
    color: "#94A3B8",
  },
  val: {
    flex: 1,
    fontSize: 9,
  },

  // ─ Two-column layout ──────────────────────────
  twoCol: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },

  // ─ Table ──────────────────────────────────────
  table: {
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DEFAULT_PRIMARY,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  th: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: `0.5px solid ${BORDER_COLOR}`,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  td: {
    fontSize: 8.5,
    textAlign: "center",
  },

  // ─ Footer ─────────────────────────────────────
  footer: {
    marginTop: "auto",
    paddingTop: 10,
    borderTop: `1.5px solid ${DEFAULT_PRIMARY}`,
  },
  footerDisclaimer: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#1E293B",
    lineHeight: 1.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  footerSubtext: {
    fontSize: 6.5,
    color: TEXT_MUTED,
    lineHeight: 1.4,
    marginBottom: 6,
  },
  footerObservaciones: {
    fontSize: 7.5,
    color: "#334155",
    lineHeight: 1.4,
    marginBottom: 8,
    padding: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 3,
    border: `0.5px solid ${BORDER_COLOR}`,
  },
  footerRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start",
    gap: 12,
  },
  qrSection: {
    alignItems: "center",
    gap: 3,
  },
  qrImage: {
    width: 90,
    height: 90,
  },
  qrLabel: {
    fontSize: 5.5,
    color: TEXT_MUTED,
    textAlign: "center" as const,
    marginTop: 2,
  },
  signatureSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  signatureBox: {
    width: 160,
    height: 70,
    border: `1.5px solid ${DEFAULT_PRIMARY}`,
    borderRadius: 4,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: DEFAULT_PRIMARY,
    textAlign: "center" as const,
  },
  footerPage: {
    fontSize: 7,
    color: TEXT_MUTED,
    textAlign: "right" as const,
    marginTop: 6,
  },

  // ─ Status badge ───────────────────────────────
  statusRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: "bold",
  },
  statusAccepted: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  statusRejected: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },

  // ─ Route indicator ────────────────────────────
  routeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 8,
  },
  routePoint: {
    flex: 1,
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 4,
    padding: 8,
  },
  routeLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  routeAddress: {
    fontSize: 9,
    lineHeight: 1.3,
  },
  routeUbigeo: {
    fontSize: 7,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // ─ Weight box ─────────────────────────────────
  weightBox: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  weightInner: {
    border: `1px solid ${BORDER_COLOR}`,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 12,
  },
  weightLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
    fontWeight: "bold",
  },
  weightValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
});

// ── Component ────────────────────────────────────────────────────
export function GuideDocument({ data }: { data: GuideDocumentData }) {
  const primary = data.primaryColor || DEFAULT_PRIMARY;
  const secondary = data.secondaryColor || DEFAULT_SECONDARY;
  const logoSrc = resolveLogoSrc(data.remitenteLogo);
  const items = data.items || [];

  // Status badge
  const statusStyle = data.cdrAceptado
    ? s.statusAccepted
    : data.cdrCode && data.cdrCode !== "98"
      ? s.statusRejected
      : s.statusPending;
  const statusText = data.cdrAceptado
    ? "ACEPTADO POR SUNAT"
    : data.cdrCode && data.cdrCode !== "98"
      ? "RECHAZADO POR SUNAT"
      : "PENDIENTE";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ─────────────────────────────────── */}
        <View style={[s.header, { borderBottomColor: primary }]}>
          <View style={s.headerLeft}>
            <CompanyLogo src={logoSrc} size={68} />
            <Text style={s.companyName}>{data.remitenteRazonSocial}</Text>
            {data.remitenteAddress && (
              <Text style={s.companyInfo}>{data.remitenteAddress}</Text>
            )}
            {data.remitentePhone && (
              <Text style={s.companyInfo}>Tel: {data.remitentePhone}</Text>
            )}
          </View>
          <View style={s.headerRight}>
            <View style={[s.docBox, { borderColor: primary }]}>
              <Text style={s.docRuc}>RUC: {data.remitenteRuc}</Text>
              <View style={[s.docTitleBar, { backgroundColor: primary }]}>
                <Text style={s.docTitle}>
                  GUIA DE REMISION ELECTRONICA
                </Text>
              </View>
              <Text style={s.docNumber}>
                {data.serie}-{data.correlativo}
              </Text>
            </View>
          </View>
        </View>

        {/* ── SUNAT Status ───────────────────────────── */}
        <View style={s.statusRow}>
          <View style={[s.statusBadge, statusStyle]}>
            <Text>{statusText}</Text>
          </View>
        </View>

        {/* ── Datos del traslado ──────────────────────── */}
        <Text style={[s.sectionTitle, { backgroundColor: secondary }]}>
          Datos del Traslado
        </Text>
        <View style={s.sectionBox}>
          <View style={s.twoCol}>
            <View style={s.col}>
              <View style={s.row}>
                <Text style={s.label}>Fecha de Emision</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{formatDate(data.fechaEmision || data.fechaTraslado)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Fecha de Traslado</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{formatDate(data.fechaTraslado)}</Text>
              </View>
            </View>
            <View style={s.col}>
              <View style={s.row}>
                <Text style={s.label}>Motivo de Traslado</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{getMotivo(data.motivoTraslado)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Modalidad</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{getModalidad(data.modalidadTraslado)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Route: Partida → Llegada ────────────────── */}
        <Text style={[s.sectionTitle, { backgroundColor: secondary }]}>
          Ruta de Traslado
        </Text>
        <View style={s.routeContainer}>
          <View style={s.routePoint}>
            <Text style={s.routeLabel}>Punto de Partida</Text>
            <Text style={s.routeAddress}>
              {data.puntoPartidaDireccion || data.puntoPartida}
            </Text>
            {data.puntoPartidaUbigeo && (
              <Text style={s.routeUbigeo}>Ubigeo: {data.puntoPartidaUbigeo}</Text>
            )}
          </View>
          <View style={s.routePoint}>
            <Text style={s.routeLabel}>Punto de Llegada</Text>
            <Text style={s.routeAddress}>
              {data.puntoLlegadaDireccion || data.puntoLlegada}
            </Text>
            {data.puntoLlegadaUbigeo && (
              <Text style={s.routeUbigeo}>Ubigeo: {data.puntoLlegadaUbigeo}</Text>
            )}
          </View>
        </View>

        {/* ── Destinatario + Transportista ─────────────── */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={[s.sectionTitle, { backgroundColor: secondary }]}>
              Destinatario
            </Text>
            <View style={s.sectionBox}>
              <View style={s.row}>
                <Text style={s.label}>Tipo Documento</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{getDocType(data.destinatarioTipoDocumento)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Numero</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{data.destinatarioNumeroDocumento}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Razon Social</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{data.destinatarioRazonSocial}</Text>
              </View>
            </View>
          </View>
          <View style={s.col}>
            <Text style={[s.sectionTitle, { backgroundColor: secondary }]}>
              Transportista
            </Text>
            <View style={s.sectionBox}>
              <View style={s.row}>
                <Text style={s.label}>Tipo Documento</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{getDocType(data.transportistaTipoDocumento)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Numero</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{data.transportistaNumeroDocumento}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Razon Social</Text>
                <Text style={s.colon}>:</Text>
                <Text style={s.val}>{data.transportistaRazonSocial}</Text>
              </View>
              {data.transportistaNumeroPlaca && (
                <View style={s.row}>
                  <Text style={s.label}>Placa Vehiculo</Text>
                  <Text style={s.colon}>:</Text>
                  <Text style={[s.val, { fontWeight: "bold" }]}>
                    {data.transportistaNumeroPlaca}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Items table ─────────────────────────────── */}
        <Text style={[s.sectionTitle, { backgroundColor: secondary }]}>
          Bienes a Trasladar
        </Text>
        {items.length > 0 ? (
          <View style={s.table}>
            <View style={[s.tableHeader, { backgroundColor: primary }]}>
              <Text style={[s.th, { width: 30 }]}>N°</Text>
              <Text style={[s.th, { width: 70 }]}>Codigo</Text>
              <Text style={[s.th, { flex: 1, textAlign: "left" }]}>Descripcion</Text>
              <Text style={[s.th, { width: 60 }]}>Cantidad</Text>
              <Text style={[s.th, { width: 60 }]}>U.M.</Text>
            </View>
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                <View
                  style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
                >
                  <Text style={[s.td, { width: 30 }]}>{idx + 1}</Text>
                  <Text style={[s.td, { width: 70 }]}>{item.codigo || "—"}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "left" }]}>
                    {item.descripcion}
                  </Text>
                  <Text style={[s.td, { width: 60, fontWeight: "bold" }]}>
                    {item.cantidad}
                  </Text>
                  <Text style={[s.td, { width: 60 }]}>{getUM(item.unidadMedida)}</Text>
                </View>
                {item.serials && item.serials.length > 0 && (
                  <View
                    style={[
                      s.tableRow,
                      idx % 2 === 1 ? s.tableRowAlt : {},
                      { borderTopWidth: 0, paddingTop: 0 },
                    ]}
                  >
                    {/* Skip N° column */}
                    <Text style={{ width: 30 }} />
                    {/* Skip Codigo column */}
                    <Text style={{ width: 70 }} />
                    {/* Series aligned under Descripcion, wrapping naturally */}
                    <Text
                      style={{
                        flex: 1,
                        textAlign: "left",
                        fontSize: 6.5,
                        color: "#555",
                        paddingHorizontal: 4,
                        paddingBottom: 3,
                      }}
                      wrap={true}
                    >
                      <Text style={{ fontWeight: "bold" }}>Series: </Text>
                      {item.serials.join(", ")}
                    </Text>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={[s.sectionBox, { alignItems: "center", paddingVertical: 14 }]}>
            <Text style={{ fontSize: 8, color: TEXT_MUTED }}>
              No hay items registrados para esta guia
            </Text>
          </View>
        )}

        {/* ── Weight ──────────────────────────────────── */}
        {data.pesoBrutoTotal != null && data.pesoBrutoTotal > 0 && (
          <View style={s.weightBox}>
            <View style={s.weightInner}>
              <View>
                <Text style={s.weightLabel}>Peso Bruto Total</Text>
                <Text style={s.weightValue}>
                  {data.pesoBrutoTotal} {data.pesoBrutoUnidad || "KGM"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Footer ──────────────────────────────────── */}
        <View style={[s.footer, { borderTopColor: primary }]}>
          <Text style={s.footerDisclaimer}>
            REPRESENTACION IMPRESA DE GUIA DE REMISION REMITENTE ELECTRONICA.
            {"\n"}LA MERCADERIA VIAJA POR RIESGO Y CUENTA DEL CLIENTE.
          </Text>

          {data.observaciones && (
            <View style={s.footerObservaciones}>
              <Text>{data.observaciones}</Text>
            </View>
          )}

          {data.cdrDescription && (
            <Text style={s.footerSubtext}>
              Respuesta SUNAT: {data.cdrDescription}
            </Text>
          )}

          <View style={s.footerRow}>
            {/* QR Code */}
            <View style={s.qrSection}>
              {data.qrDataUrl ? (
                <>
                  <Image src={data.qrDataUrl} style={s.qrImage} />
                  <Text style={s.qrLabel}>Escanee para verificar</Text>
                </>
              ) : (
                <View style={[s.qrImage, { backgroundColor: "#F1F5F9", borderRadius: 4, justifyContent: "center", alignItems: "center" }]}>
                  <Text style={{ fontSize: 6, color: TEXT_MUTED, textAlign: "center" }}>
                    QR{"\n"}no disponible
                  </Text>
                </View>
              )}
            </View>

            {/* Middle info */}
            <View style={{ flex: 1, justifyContent: "center", gap: 2 }}>
              <Text style={{ fontSize: 7, color: TEXT_MUTED, lineHeight: 1.4 }}>
                N° {data.serie}-{data.correlativo}
              </Text>
              <Text style={{ fontSize: 7, color: TEXT_MUTED, lineHeight: 1.4 }}>
                RUC: {data.remitenteRuc}
              </Text>
              <Text style={{ fontSize: 6, color: "#94A3B8", lineHeight: 1.4, marginTop: 2 }}>
                Este documento es una representacion impresa de la guia de remision electronica.
                Para verificar su validez, escanee el codigo QR o consulte con el RUC, serie y correlativo.
              </Text>
            </View>

            {/* Signature box */}
            <View style={s.signatureSection}>
              <View style={[s.signatureBox, { borderColor: primary }]}>
                <Text style={[s.signatureLabel, { color: primary }]}>
                  RECIBI{"\n"}CONFORME
                </Text>
              </View>
            </View>
          </View>

          <Text style={s.footerPage}>Pagina 1 de 1</Text>
        </View>
      </Page>
    </Document>
  );
}
