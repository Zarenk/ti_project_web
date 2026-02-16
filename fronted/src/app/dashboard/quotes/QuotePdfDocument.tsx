"use client"

import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer"
import type { BankAccount } from "./quotes.api"

type QuotePdfItem = {
  name: string
  price: number
  quantity: number
  description?: string
  specs?: string[]
  image?: string
}

type QuotePdfData = {
  companyName: string
  companyLogoUrl?: string
  companyAddress: string
  companyPhone: string
  companyEmail?: string
  clientName: string
  contactName: string
  clientDocType?: string
  clientDocNumber?: string
  validity: string
  currency: string
  conditions: string
  issuedAt: string
  quoteNumber: string
  items: QuotePdfItem[]
  subtotal: number
  margin: number
  tax: number
  total: number
  bankAccounts?: BankAccount[]
}

const BRAND_PRIMARY = "#1e3a5f"
const BRAND_ACCENT = "#2563EB"
const TEXT_MAIN = "#111827"
const TEXT_MUTED = "#64748B"
const BORDER_LIGHT = "#E2E8F0"
const ROW_ALT = "#F8FAFC"
const ROW_WHITE = "#FFFFFF"
const FOOTER_HEIGHT = 38

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: FOOTER_HEIGHT,
    paddingHorizontal: 0,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: TEXT_MAIN,
  },

  /* ── Top brand bar ── */
  topBar: {
    height: 8,
    backgroundColor: BRAND_PRIMARY,
  },

  /* ── Content wrapper ── */
  content: {
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 10,
    flex: 1,
  },

  /* ── Header ── */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 30,
  },
  brandBlock: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 6,
    objectFit: "cover",
  },
  brandText: {
    flex: 1,
    justifyContent: "center",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.4,
  },

  /* ── Quote number block (right side) ── */
  quoteBlock: {
    alignItems: "flex-end",
    minWidth: 160,
  },
  quoteLabel: {
    fontSize: 8,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  quoteNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    width: 50,
    textAlign: "right",
  },
  metaValue: {
    fontSize: 8.5,
    fontWeight: "bold",
  },

  /* ── Accent divider ── */
  accentDivider: {
    height: 2,
    backgroundColor: BRAND_ACCENT,
    marginBottom: 16,
    borderRadius: 1,
  },

  /* ── Client card ── */
  clientCard: {
    flexDirection: "row",
    borderLeft: `3 solid ${BRAND_ACCENT}`,
    backgroundColor: ROW_ALT,
    borderRadius: 4,
    padding: 10,
    marginBottom: 18,
    gap: 24,
  },
  clientCol: {
    flex: 1,
  },
  clientLabel: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  clientValue: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 1,
  },
  clientSub: {
    fontSize: 9,
    color: TEXT_MUTED,
  },

  /* ── Items table ── */
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_PRIMARY,
    borderRadius: 4,
    padding: 7,
    marginTop: 24,
    marginBottom: 2,
  },
  thText: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    padding: 7,
    borderBottom: `0.5 solid ${BORDER_LIGHT}`,
    minHeight: 24,
  },
  colDesc: { width: "50%" },
  colPrice: { width: "18%", textAlign: "right" },
  colQty: { width: "12%", textAlign: "center" },
  colSubtotal: { width: "20%", textAlign: "right" },
  itemName: {
    fontSize: 9.5,
    fontWeight: "bold",
  },
  itemDescription: {
    marginTop: 1,
    color: TEXT_MUTED,
    fontSize: 8,
  },
  itemSpecs: {
    marginTop: 2,
  },
  itemSpecLine: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    lineHeight: 1.4,
  },
  itemImageContainer: {
    marginRight: 8,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    objectFit: "cover",
    border: `0.5 solid ${BORDER_LIGHT}`,
  },
  itemContentWithImage: {
    flexDirection: "row",
    gap: 8,
  },

  /* ── Totals ── */
  totalsWrapper: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  totalsCard: {
    width: 220,
    borderRadius: 6,
    border: `1 solid ${BORDER_LIGHT}`,
    backgroundColor: ROW_ALT,
    padding: 10,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
  },
  totalsValue: {
    fontSize: 9,
  },
  totalsDivider: {
    borderBottom: `1 solid ${BORDER_LIGHT}`,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
  },

  /* ── Conditions ── */
  conditionsSection: {
    marginTop: 16,
  },
  conditionsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  conditionsText: {
    fontSize: 8.5,
    color: TEXT_MUTED,
    lineHeight: 1.5,
  },

  /* ── Bank accounts ── */
  bankSection: {
    marginTop: 16,
  },
  bankTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: BRAND_PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  bankCard: {
    borderLeft: `3 solid ${BRAND_ACCENT}`,
    backgroundColor: ROW_ALT,
    borderRadius: 4,
    padding: 10,
  },
  bankRow: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 16,
  },
  bankLabel: {
    fontSize: 7.5,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bankValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: TEXT_MAIN,
  },
  bankCci: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 1,
  },

  /* ── Footer (fixed on every page) ── */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: BRAND_PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  footerLine: {
    fontSize: 7.5,
    color: "#FFFFFF",
    opacity: 0.85,
    textAlign: "center",
    lineHeight: 1.5,
  },
  footerBold: {
    fontSize: 8,
    color: "#FFFFFF",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
  },

  /* ── Page number ── */
  pageNumber: {
    position: "absolute",
    bottom: 4,
    right: 36,
    fontSize: 7,
    color: "#FFFFFF",
    opacity: 0.7,
  },
})

function fmtCurrency(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(2)}`
}

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Top brand bar ── */}
        <View style={s.topBar} fixed />

        {/* ── Main content ── */}
        <View style={s.content}>
          {/* ── Header: company + quote meta (no break inside) ── */}
          <View style={s.headerRow} wrap={false}>
            <View style={s.brandBlock}>
              {data.companyLogoUrl ? (
                <Image style={s.logo} src={data.companyLogoUrl} />
              ) : null}
              <View style={s.brandText}>
                <Text style={s.companyName}>{data.companyName}</Text>
                {data.companyAddress ? (
                  <Text style={s.companyDetail}>{data.companyAddress}</Text>
                ) : null}
                {data.companyPhone ? (
                  <Text style={s.companyDetail}>Tel: {data.companyPhone}</Text>
                ) : null}
                {data.companyEmail ? (
                  <Text style={s.companyDetail}>{data.companyEmail}</Text>
                ) : null}
              </View>
            </View>

            <View style={s.quoteBlock}>
              <Text style={s.quoteLabel}>N° Cotización</Text>
              <Text style={s.quoteNumber}>{data.quoteNumber}</Text>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Fecha:</Text>
                <Text style={s.metaValue}>{data.issuedAt}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Validez:</Text>
                <Text style={s.metaValue}>{data.validity}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Moneda:</Text>
                <Text style={s.metaValue}>{data.currency}</Text>
              </View>
            </View>
          </View>

          {/* ── Accent divider ── */}
          <View style={s.accentDivider} />

          {/* ── Client info card (no break inside) - only show if client data exists ── */}
          {(data.clientName || data.contactName) ? (
            <View style={s.clientCard} wrap={false}>
              <View style={s.clientCol}>
                {data.clientName ? (
                  <>
                    <Text style={s.clientLabel}>Cliente</Text>
                    <Text style={s.clientValue}>{data.clientName}</Text>
                    {(data.clientDocType && data.clientDocNumber) ? (
                      <Text style={s.clientSub}>{data.clientDocType}: {data.clientDocNumber}</Text>
                    ) : null}
                  </>
                ) : null}
                {data.contactName ? (
                  <Text style={s.clientSub}>{data.contactName}</Text>
                ) : null}
              </View>
              <View style={s.clientCol}>
                <Text style={s.clientLabel}>Detalle</Text>
                <Text style={s.clientSub}>Validez: {data.validity}</Text>
                <Text style={s.clientSub}>Moneda: {data.currency}</Text>
              </View>
            </View>
          ) : null}

          {/* ── Items table ── */}
          <Text style={s.sectionTitle}>Items</Text>

          {/* Table header — ensure at least 1 row fits after it */}
          <View style={s.tableHeader} minPresenceAhead={30}>
            <Text style={[s.thText, s.colDesc]}>Descripción</Text>
            <Text style={[s.thText, s.colPrice]}>P. Unitario</Text>
            <Text style={[s.thText, s.colQty]}>Cant.</Text>
            <Text style={[s.thText, s.colSubtotal]}>Subtotal</Text>
          </View>

          {/* Each row won't split across pages */}
          {data.items.map((item, idx) => (
            <View
              key={`${item.name}-${idx}`}
              wrap={false}
              style={[
                s.tableRow,
                { backgroundColor: idx % 2 === 0 ? ROW_WHITE : ROW_ALT },
              ]}
            >
              <View style={s.colDesc}>
                {item.image ? (
                  <View style={s.itemContentWithImage}>
                    <View style={s.itemImageContainer}>
                      <Image style={s.itemImage} src={item.image} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={s.itemDescription}>{item.description}</Text>
                      ) : null}
                      {item.specs?.length ? (
                        <View style={s.itemSpecs}>
                          {item.specs.slice(0, 5).map((spec, si) => (
                            <Text key={`${spec}-${si}`} style={s.itemSpecLine}>
                              · {spec}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={s.itemName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={s.itemDescription}>{item.description}</Text>
                    ) : null}
                    {item.specs?.length ? (
                      <View style={s.itemSpecs}>
                        {item.specs.slice(0, 6).map((spec, si) => (
                          <Text key={`${spec}-${si}`} style={s.itemSpecLine}>
                            · {spec}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </>
                )}
              </View>
              <Text style={[{ fontSize: 9.5 }, s.colPrice]}>
                {fmtCurrency(data.currency, item.price)}
              </Text>
              <Text style={[{ fontSize: 9.5 }, s.colQty]}>{item.quantity}</Text>
              <Text style={[{ fontSize: 9.5, fontWeight: "bold" }, s.colSubtotal]}>
                {fmtCurrency(data.currency, item.price * item.quantity)}
              </Text>
            </View>
          ))}

          {/* ── Totals (never split) ── */}
          <View style={s.totalsWrapper} wrap={false}>
            <View style={s.totalsCard}>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Subtotal (sin IGV)</Text>
                <Text style={s.totalsValue}>
                  {fmtCurrency(data.currency, data.subtotal)}
                </Text>
              </View>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Impuestos</Text>
                <Text style={s.totalsValue}>
                  {fmtCurrency(data.currency, data.tax)}
                </Text>
              </View>
              <View style={s.totalsDivider} />
              <View style={s.totalsRow}>
                <Text style={s.totalLabel}>Total</Text>
                <Text style={s.totalValue}>
                  {fmtCurrency(data.currency, data.total)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Bank accounts (never split) ── */}
          {data.bankAccounts && data.bankAccounts.length > 0 ? (
            <View style={s.bankSection} wrap={false}>
              <Text style={s.bankTitle}>Cuentas Bancarias</Text>
              <View style={s.bankCard}>
                {data.bankAccounts.map((account, idx) => (
                  <View key={`bank-${idx}`} style={[s.bankRow, idx === data.bankAccounts!.length - 1 ? { marginBottom: 0 } : {}]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bankLabel}>{account.bankName}</Text>
                      {account.accountHolderName ? (
                        <Text style={s.bankValue}>{account.accountHolderName}</Text>
                      ) : null}
                      <Text style={s.bankValue}>{account.accountNumber}</Text>
                      {account.cci ? (
                        <Text style={s.bankCci}>CCI: {account.cci}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Conditions (never split) ── */}
          {data.conditions ? (
            <View style={s.conditionsSection} wrap={false}>
              <Text style={s.conditionsTitle}>Condiciones</Text>
              <Text style={s.conditionsText}>{data.conditions}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Footer bar (fixed on every page) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerBold}>{data.companyName}</Text>
          <Text style={s.footerLine}>
            {[data.companyPhone, data.companyEmail, data.companyAddress]
              .filter(Boolean)
              .join("  •  ")}
          </Text>
        </View>

        {/* ── Page number ── */}
        <Text
          style={s.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `${pageNumber} / ${totalPages}` : ""
          }
        />
      </Page>
    </Document>
  )
}
