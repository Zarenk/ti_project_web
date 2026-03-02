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

const BACKEND_BASE_URL = BACKEND_URL;

// ── Amber / Dark-orange palette to distinguish from invoices ──
const PRIMARY = "#92400E"; // amber-800
const SECONDARY = "#B45309"; // amber-700
const ACCENT_BG = "#FFFBEB"; // amber-50
const ACCENT_BORDER = "#F59E0B"; // amber-500
const DARK_TEXT = "#1C1917"; // stone-900
const MUTED_TEXT = "#78716C"; // stone-500

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    color: DARK_TEXT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottom: `1px solid ${ACCENT_BORDER}`,
    paddingBottom: 10,
  },
  leftColumn: {
    width: "60%",
  },
  rightColumn: {
    width: "40%",
    alignItems: "flex-end",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 5,
  },
  companyName: {
    fontSize: 10,
    fontWeight: "bold",
  },
  rucText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  invoiceBox: {
    border: `1px solid ${ACCENT_BORDER}`,
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  titleBox: {
    backgroundColor: PRIMARY,
    padding: 6,
    borderRadius: 4,
    marginBottom: 4,
    width: "100%",
    alignItems: "center",
  },
  titleText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  // ── Reference document section ──
  refBox: {
    border: `1px solid ${ACCENT_BORDER}`,
    backgroundColor: ACCENT_BG,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  refTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: PRIMARY,
    marginBottom: 4,
  },
  // ── Client + date wrapper ──
  clienteFechaWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 0,
  },
  box: {
    border: "1px solid #aaa",
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    width: "60%",
    height: 112,
    justifyContent: "flex-start",
  },
  fechaBox: {
    border: "1px solid #aaa",
    borderRadius: 4,
    padding: 8,
    width: "40%",
    height: 112,
    justifyContent: "flex-start",
  },
  rowFieldLeft: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-start",
  },
  labelBox: {
    width: 90,
    textAlign: "left",
  },
  colon: {
    width: 10,
    textAlign: "center",
  },
  valueLeft: {
    flex: 1,
    textAlign: "left",
  },
  // ── Table ──
  table: {
    border: "1px solid #aaa",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: SECONDARY,
    color: "#fff",
    fontWeight: "bold",
    padding: 6,
    borderBottom: "1px solid #aaa",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1px solid #ccc",
    alignItems: "center",
  },
  cell: {
    textAlign: "left",
  },
  cellCenter: {
    textAlign: "center",
  },
  // ── Totals ──
  totalsRight: {
    marginTop: 10,
    padding: 6,
    border: `1px solid ${PRIMARY}`,
    borderRadius: 4,
    width: "50%",
    alignSelf: "flex-end",
    alignItems: "flex-end",
    gap: 2,
  },
  rowField: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 2,
    alignItems: "center",
  },
  label: {
    width: 90,
    textAlign: "right",
  },
  labelTotal: {
    width: 90,
    textAlign: "right",
    fontWeight: "bold",
  },
  value: {
    width: 60,
    textAlign: "right",
  },
  currency: {
    width: 25,
    textAlign: "right",
  },
  // ── Footer ──
  importeBox: {
    marginTop: 10,
    padding: 6,
    backgroundColor: ACCENT_BG,
    border: `1px solid ${ACCENT_BORDER}`,
    fontStyle: "italic",
  },
  motivoBox: {
    marginTop: 10,
    padding: 8,
    border: `1px solid ${ACCENT_BORDER}`,
    backgroundColor: ACCENT_BG,
    borderRadius: 4,
  },
  qrSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  observaciones: {
    fontSize: 7,
    marginTop: 10,
    marginLeft: 20,
    lineHeight: 1.2,
  },
});

function wrapText(text: string, maxLength: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxLength) {
      currentLine = nextLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}

function resolveLogoSrc(raw?: string | null): string {
  const fallback = "/logo_ti.png";
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^\/+/, "");
  if (BACKEND_BASE_URL) return `${BACKEND_BASE_URL}/${normalized}`;
  return `/${normalized}`;
}

// ── SUNAT motivo code labels ──
const MOTIVO_LABELS: Record<string, string> = {
  "01": "Anulación de la operación",
  "02": "Anulación por error en el RUC",
  "03": "Corrección por error en la descripción",
  "04": "Descuento global",
  "05": "Descuento por ítem",
  "06": "Devolución total",
  "07": "Devolución por ítem",
  "09": "Bonificación",
  "10": "Disminución en el valor",
  "13": "Ajustes - Pérdidas",
};

export interface CreditNoteDocumentData {
  serie: string;
  correlativo: string;
  fechaEmision: string;
  tipoMoneda?: string;
  emisor: {
    ruc?: string;
    razonSocial?: string;
    direccion?: string;
    telefono?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  cliente: {
    tipoDocumento?: string;
    numeroDocumento?: string;
    razonSocial?: string;
    direccion?: string;
  };
  documentoModificado: {
    tipo: string; // "01" or "03"
    serie: string;
    correlativo: string;
  };
  motivo: string;
  codigoMotivo: string;
  items: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
    unitCode?: string;
    series?: string[];
  }[];
  subtotal: number;
  igv: number;
  total: number;
}

export function CreditNoteDocument({
  data,
  qrCode,
  importeEnLetras,
}: {
  data: CreditNoteDocumentData;
  qrCode: string;
  importeEnLetras: string;
}) {
  const tipoOriginalLabel =
    data.documentoModificado.tipo === "01" ? "FACTURA" : "BOLETA";

  const moneda = (data.tipoMoneda ?? "PEN") === "PEN" ? "SOLES" : (data.tipoMoneda ?? "PEN").toUpperCase();
  const currencySymbol = (data.tipoMoneda ?? "PEN") === "PEN" ? "S/." : "$";

  const direccionFormateada = wrapText(data.cliente.direccion || "N/A", 40);

  const emitter = data.emisor;
  const emitterName = emitter.razonSocial || "Nombre no disponible";
  const emitterAddress = wrapText(emitter.direccion || "Dirección no disponible", 40);
  const emitterPhone = emitter.telefono || null;
  const emitterRuc = emitter.ruc || "—";
  const logoSrc = resolveLogoSrc(emitter.logoUrl ?? null);

  const primaryColor = emitter.primaryColor || PRIMARY;
  const secondaryColor = emitter.secondaryColor || SECONDARY;

  const motivoLabel = MOTIVO_LABELS[data.codigoMotivo] ?? data.codigoMotivo;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.leftColumn}>
            <Image src={logoSrc} style={styles.logo} />
            <Text style={styles.companyName}>{emitterName}</Text>
            <Text>{emitterAddress}</Text>
            {emitterPhone ? <Text>TELÉFONO: {emitterPhone}</Text> : null}
          </View>
          <View style={styles.rightColumn}>
            <View style={styles.invoiceBox}>
              <Text style={styles.rucText}>RUC: {emitterRuc}</Text>
              <View style={[styles.titleBox, { backgroundColor: primaryColor }]}>
                <Text style={styles.titleText}>NOTA DE CRÉDITO ELECTRÓNICA</Text>
              </View>
              <Text style={{ fontSize: 12 }}>
                N° {data.serie}-{data.correlativo}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Reference: original document ── */}
        <View style={styles.refBox}>
          <Text style={styles.refTitle}>DOCUMENTO QUE MODIFICA</Text>
          <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Tipo Documento</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>{tipoOriginalLabel} ELECTRÓNICA</Text>
          </View>
          <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Serie - Correlativo</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>
              {data.documentoModificado.serie}-{data.documentoModificado.correlativo}
            </Text>
          </View>
          <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Código Motivo</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>
              {data.codigoMotivo} — {motivoLabel}
            </Text>
          </View>
        </View>

        {/* ── Client + Date section ── */}
        <View style={styles.clienteFechaWrapper}>
          <View style={styles.box}>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
              Datos del Cliente:
            </Text>
            <View style={styles.rowFieldLeft}>
              <Text style={styles.labelBox}>Documento</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.valueLeft}>
                {data.cliente.numeroDocumento || "—"}
              </Text>
            </View>
            <View style={styles.rowFieldLeft}>
              <Text style={styles.labelBox}>Nombre</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.valueLeft}>
                {data.cliente.razonSocial || "—"}
              </Text>
            </View>
            <View style={styles.rowFieldLeft}>
              <Text style={styles.labelBox}>Dirección</Text>
              <Text style={styles.colon}>:</Text>
              <Text
                style={styles.valueLeft}
                hyphenationCallback={(word: string) => [word]}
              >
                {direccionFormateada}
              </Text>
            </View>
          </View>

          <View style={styles.fechaBox}>
            <View style={styles.rowFieldLeft}>
              <Text style={styles.labelBox}>Fecha de Emisión</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.valueLeft}>
                {new Date(data.fechaEmision).toLocaleDateString("es-PE")}
              </Text>
            </View>
            <View style={styles.rowFieldLeft}>
              <Text style={styles.labelBox}>Moneda</Text>
              <Text style={styles.colon}>:</Text>
              <Text style={styles.valueLeft}>{moneda}</Text>
            </View>
          </View>
        </View>

        {/* ── Items table ── */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: secondaryColor }]}>
            <Text style={[styles.cellCenter, { width: "8%" }]}>Cant.</Text>
            <Text style={[styles.cellCenter, { width: "7%" }]}>UM</Text>
            <Text style={[styles.cell, { width: "45%" }]}>Descripción</Text>
            <Text style={[styles.cell, { width: "12%", textAlign: "right" }]}>V/U</Text>
            <Text style={[styles.cell, { width: "13%", textAlign: "right" }]}>P/U</Text>
            <Text style={[styles.cell, { width: "15%", textAlign: "right" }]}>Total</Text>
          </View>
          {data.items.map((item, idx) => (
            <View style={[styles.tableRow, { alignItems: "flex-start" }]} key={idx}>
              <Text style={[styles.cellCenter, { width: "8%" }]}>{item.cantidad}</Text>
              <Text style={[styles.cellCenter, { width: "7%" }]}>{item.unitCode || "NIU"}</Text>
              <View style={{ width: "45%" }}>
                <Text style={{ fontSize: 10 }}>
                  {(item.descripcion || "").replace(/\\n/g, "\n")}
                </Text>
                {item.series && item.series.length > 0 && (
                  <Text style={{ fontSize: 8, marginTop: 2, color: "#333" }}>
                    {item.series.length === 1 ? "SERIE N°: " : "SERIES N°: "}
                    {item.series.join(", ")}
                  </Text>
                )}
              </View>
              <Text style={[styles.cell, { width: "12%", textAlign: "right" }]}>
                {(item.precioUnitario / 1.18).toFixed(2)}
              </Text>
              <Text style={[styles.cell, { width: "13%", textAlign: "right" }]}>{item.precioUnitario.toFixed(2)}</Text>
              <Text style={[styles.cell, { width: "15%", textAlign: "right" }]}>{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsRight}>
          <View style={styles.rowField}>
            <Text style={styles.label}>GRAVADA</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.currency}>{currencySymbol}</Text>
            <Text style={styles.value}>{data.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.rowField}>
            <Text style={styles.label}>IGV (18%)</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.currency}>{currencySymbol}</Text>
            <Text style={styles.value}>{data.igv.toFixed(2)}</Text>
          </View>
          <View style={styles.rowField}>
            <Text style={styles.labelTotal}>TOTAL</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.currency}>{currencySymbol}</Text>
            <Text style={[styles.value, { fontWeight: "bold" }]}>
              {data.total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ── Importe en letras ── */}
        <View style={styles.importeBox}>
          <Text>{importeEnLetras || "N/A"}</Text>
        </View>

        {/* ── Motivo section ── */}
        <View style={styles.motivoBox}>
          <Text style={{ fontWeight: "bold", fontSize: 9, color: PRIMARY, marginBottom: 2 }}>
            MOTIVO DE LA NOTA DE CRÉDITO:
          </Text>
          <Text style={{ fontSize: 9 }}>{data.motivo}</Text>
        </View>

        <View>
          <Text style={styles.observaciones}>
            DOCUMENTO ASOCIADO: {tipoOriginalLabel} ELECTRÓNICA{" "}
            {data.documentoModificado.serie}-{data.documentoModificado.correlativo}
          </Text>
        </View>

        {/* ── QR section ── */}
        <View style={styles.qrSection}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 9, marginBottom: 4 }}>
              Representación impresa de la NOTA DE CRÉDITO ELECTRÓNICA
            </Text>
            <Text style={{ fontSize: 9, marginBottom: 6 }}>
              N° {data.serie}-{data.correlativo}
            </Text>
            <Text style={{ fontSize: 7, color: MUTED_TEXT, lineHeight: 1.4 }}>
              Este documento es una representación impresa de la nota de crédito
              electrónica. Modifica la {tipoOriginalLabel.toLowerCase()}{" "}
              {data.documentoModificado.serie}-{data.documentoModificado.correlativo}.
              Para verificar su autenticidad, escanee el código QR o ingrese a
              nuestro portal de verificación.
            </Text>
          </View>
          {qrCode && <Image src={qrCode} style={styles.qrImage} />}
        </View>
      </Page>
    </Document>
  );
}
