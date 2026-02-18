'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const BRAND = '#1a1a2e'
const ACCENT = '#16a34a'
const BORDER = '#e2e8f0'
const MUTED = '#64748b'

const s = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  header: {
    textAlign: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `1 solid ${BORDER}`,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND,
    marginBottom: 2,
  },
  storeInfo: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 1,
  },
  receiptTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 2,
  },
  receiptMeta: {
    fontSize: 8,
    color: MUTED,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: MUTED,
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: BRAND,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 2,
  },
  thText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: `0.5 solid ${BORDER}`,
  },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTop: `1 solid ${BORDER}`,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
    width: '50%',
  },
  totalLabel: {
    flex: 1,
    fontSize: 9,
    color: MUTED,
  },
  totalValue: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '50%',
    marginTop: 4,
    paddingTop: 4,
    borderTop: `1 solid ${BRAND}`,
  },
  grandTotalLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND,
  },
  grandTotalValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    color: ACCENT,
  },
  paymentSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  paymentLabel: {
    fontSize: 9,
    color: MUTED,
  },
  paymentValue: {
    fontSize: 9,
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    paddingTop: 10,
    borderTop: `0.5 solid ${BORDER}`,
  },
  footerText: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 1,
  },
  thankYou: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BRAND,
    marginTop: 4,
  },
})

export type RestaurantReceiptData = {
  storeName: string
  storeAddress?: string
  orderNumber: string
  tableName?: string
  orderType: string
  dateTime: string
  waiter?: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  serviceCharge?: number
  serviceChargePercent?: number
  tip?: number
  igv: number
  total: number
  paymentMethod: string
  tipoComprobante?: string
  notes?: string
}

export function RestaurantReceiptPdf({ data }: { data: RestaurantReceiptData }) {
  return (
    <Document>
      <Page size="A5" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.storeName}>{data.storeName}</Text>
          {data.storeAddress && (
            <Text style={s.storeInfo}>{data.storeAddress}</Text>
          )}
          <Text style={s.receiptTitle}>
            {data.tipoComprobante === 'FACTURA'
              ? 'FACTURA'
              : data.tipoComprobante === 'BOLETA'
                ? 'BOLETA DE VENTA'
                : 'NOTA DE VENTA'}
          </Text>
          <Text style={s.receiptMeta}>
            Orden #{data.orderNumber} | {data.dateTime}
          </Text>
          {data.tableName && (
            <Text style={s.receiptMeta}>Mesa: {data.tableName}</Text>
          )}
          {data.waiter && (
            <Text style={s.receiptMeta}>Atendido por: {data.waiter}</Text>
          )}
        </View>

        {/* Items table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Detalle del pedido</Text>
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colName]}>Plato</Text>
            <Text style={[s.thText, s.colQty]}>Cant.</Text>
            <Text style={[s.thText, s.colPrice]}>P. Unit</Text>
            <Text style={[s.thText, s.colTotal]}>Total</Text>
          </View>
          {data.items.map((item, idx) => (
            <View style={s.tableRow} key={idx}>
              <Text style={s.colName}>{item.name}</Text>
              <Text style={s.colQty}>{item.quantity}</Text>
              <Text style={s.colPrice}>S/. {item.unitPrice.toFixed(2)}</Text>
              <Text style={s.colTotal}>S/. {item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>S/. {data.subtotal.toFixed(2)}</Text>
          </View>
          {(data.serviceCharge ?? 0) > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>
                Servicio ({data.serviceChargePercent ?? 0}%)
              </Text>
              <Text style={s.totalValue}>
                S/. {(data.serviceCharge ?? 0).toFixed(2)}
              </Text>
            </View>
          )}
          {(data.tip ?? 0) > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Propina</Text>
              <Text style={s.totalValue}>
                S/. {(data.tip ?? 0).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>IGV (18%)</Text>
            <Text style={s.totalValue}>S/. {data.igv.toFixed(2)}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>TOTAL</Text>
            <Text style={s.grandTotalValue}>S/. {data.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment info */}
        <View style={s.paymentSection}>
          <View style={s.paymentRow}>
            <Text style={s.paymentLabel}>Metodo de pago</Text>
            <Text style={s.paymentValue}>{data.paymentMethod}</Text>
          </View>
          {data.tipoComprobante && (
            <View style={s.paymentRow}>
              <Text style={s.paymentLabel}>Comprobante</Text>
              <Text style={s.paymentValue}>{data.tipoComprobante}</Text>
            </View>
          )}
          <View style={s.paymentRow}>
            <Text style={s.paymentLabel}>Tipo</Text>
            <Text style={s.paymentValue}>{data.orderType}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notas</Text>
            <Text style={{ fontSize: 8, color: MUTED }}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.thankYou}>Gracias por su preferencia</Text>
          <Text style={s.footerText}>Este documento no tiene valor fiscal</Text>
        </View>
      </Page>
    </Document>
  )
}
