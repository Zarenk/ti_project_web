'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { RestaurantReceiptData } from './RestaurantReceiptPdf'

/* ── 80mm ticket ≈ 227pt wide ── */
const TICKET_WIDTH = 227
const TICKET_HEIGHT = 600

const BORDER_COLOR = '#999'
const MUTED = '#555'

const s = StyleSheet.create({
  page: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#000',
  },
  /* ── header ── */
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 1,
  },
  storeInfo: {
    fontSize: 7,
    textAlign: 'center',
    color: MUTED,
  },
  /* ── dividers ── */
  divider: {
    borderBottom: `1 dashed ${BORDER_COLOR}`,
    marginVertical: 4,
  },
  /* ── title ── */
  titleBox: {
    alignItems: 'center',
    paddingVertical: 3,
  },
  titleText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  /* ── meta ── */
  metaRow: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  metaLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    width: 50,
  },
  metaValue: {
    fontSize: 7,
    flex: 1,
  },
  /* ── items table ── */
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#222',
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginBottom: 1,
  },
  thText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottom: `0.5 solid #ddd`,
  },
  colName: { flex: 3, fontSize: 7 },
  colQty: { flex: 0.7, fontSize: 7, textAlign: 'center' },
  colPrice: { flex: 1.3, fontSize: 7, textAlign: 'right' },
  colTotal: { flex: 1.3, fontSize: 7, textAlign: 'right' },
  /* ── totals ── */
  totalsSection: {
    marginTop: 4,
    paddingTop: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 7,
    color: MUTED,
  },
  totalValue: {
    fontSize: 7,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
    paddingTop: 3,
    paddingHorizontal: 4,
    borderTop: `1 solid #000`,
  },
  grandTotalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  /* ── payment ── */
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
    paddingHorizontal: 4,
  },
  paymentLabel: {
    fontSize: 7,
    color: MUTED,
  },
  paymentValue: {
    fontSize: 7,
  },
  /* ── footer ── */
  footer: {
    marginTop: 8,
    alignItems: 'center',
  },
  thankYou: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  footerText: {
    fontSize: 6,
    color: MUTED,
  },
})

export function TicketRestaurantReceiptPdf({ data }: { data: RestaurantReceiptData }) {
  const documentTitle =
    data.tipoComprobante === 'FACTURA'
      ? 'FACTURA'
      : data.tipoComprobante === 'BOLETA'
        ? 'BOLETA DE VENTA'
        : 'NOTA DE VENTA'

  return (
    <Document>
      <Page size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }} style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.storeName}>{data.companyName || data.storeName}</Text>
          {data.companyRuc && (
            <Text style={s.storeInfo}>RUC: {data.companyRuc}</Text>
          )}
          {(data.companyAddress || data.storeAddress) && (
            <Text style={s.storeInfo}>{data.companyAddress || data.storeAddress}</Text>
          )}
          {data.companyPhone && (
            <Text style={s.storeInfo}>Tel: {data.companyPhone}</Text>
          )}
        </View>

        <View style={s.divider} />

        {/* Document title */}
        <View style={s.titleBox}>
          <Text style={s.titleText}>{documentTitle}</Text>
          {data.receiptNumber && (
            <Text style={{ fontSize: 8, fontWeight: 'bold', marginTop: 1 }}>N° {data.receiptNumber}</Text>
          )}
        </View>

        <View style={s.divider} />

        {/* Meta */}
        <View style={{ marginBottom: 4 }}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Orden:</Text>
            <Text style={s.metaValue}>#{data.orderNumber}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Fecha:</Text>
            <Text style={s.metaValue}>{data.dateTime}</Text>
          </View>
          {data.tableName && (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Mesa:</Text>
              <Text style={s.metaValue}>{data.tableName}</Text>
            </View>
          )}
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Tipo:</Text>
            <Text style={s.metaValue}>{data.orderType}</Text>
          </View>
          {data.waiter && (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Mesero:</Text>
              <Text style={s.metaValue}>{data.waiter}</Text>
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* Items table */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colName]}>Plato</Text>
          <Text style={[s.thText, s.colQty]}>Ud</Text>
          <Text style={[s.thText, s.colPrice]}>P.U.</Text>
          <Text style={[s.thText, s.colTotal]}>Total</Text>
        </View>
        {data.items.map((item, idx) => (
          <View style={s.tableRow} key={idx}>
            <Text style={s.colName}>{item.name}</Text>
            <Text style={s.colQty}>{item.quantity}</Text>
            <Text style={s.colPrice}>S/.{item.unitPrice.toFixed(2)}</Text>
            <Text style={s.colTotal}>S/.{item.total.toFixed(2)}</Text>
          </View>
        ))}

        <View style={s.divider} />

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>S/.{data.subtotal.toFixed(2)}</Text>
          </View>
          {(data.serviceCharge ?? 0) > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Servicio ({data.serviceChargePercent ?? 0}%)</Text>
              <Text style={s.totalValue}>S/.{(data.serviceCharge ?? 0).toFixed(2)}</Text>
            </View>
          )}
          {(data.tip ?? 0) > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Propina</Text>
              <Text style={s.totalValue}>S/.{(data.tip ?? 0).toFixed(2)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>IGV (18%)</Text>
            <Text style={s.totalValue}>S/.{data.igv.toFixed(2)}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>TOTAL</Text>
            <Text style={s.grandTotalValue}>S/.{data.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Payment info */}
        <View style={{ marginVertical: 2 }}>
          <View style={s.paymentRow}>
            <Text style={s.paymentLabel}>Pago</Text>
            <Text style={s.paymentValue}>{data.paymentMethod}</Text>
          </View>
          {data.tipoComprobante && (
            <View style={s.paymentRow}>
              <Text style={s.paymentLabel}>Comprobante</Text>
              <Text style={s.paymentValue}>{data.tipoComprobante}</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {data.notes && (
          <>
            <View style={s.divider} />
            <Text style={{ fontSize: 7, color: MUTED, paddingHorizontal: 4 }}>{data.notes}</Text>
          </>
        )}

        <View style={s.divider} />

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.thankYou}>Gracias por su preferencia</Text>
          <Text style={s.footerText}>Este documento no tiene valor fiscal</Text>
        </View>
      </Page>
    </Document>
  )
}
