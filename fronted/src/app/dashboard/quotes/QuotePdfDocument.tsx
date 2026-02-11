"use client"

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

type QuotePdfItem = {
  name: string
  price: number
  quantity: number
}

type QuotePdfData = {
  companyName: string
  companyAddress: string
  companyPhone: string
  clientName: string
  contactName: string
  validity: string
  currency: string
  conditions: string
  items: QuotePdfItem[]
  subtotal: number
  margin: number
  tax: number
  total: number
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1 solid #E2E8F0",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  muted: {
    color: "#64748B",
  },
  total: {
    fontSize: 12,
    fontWeight: "bold",
  },
})

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Cotización</Text>
          <Text>{data.companyName}</Text>
          <Text style={styles.muted}>{data.companyAddress}</Text>
          <Text style={styles.muted}>{data.companyPhone}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text>{data.clientName || "Sin cliente"}</Text>
          <Text style={styles.muted}>{data.contactName || "Sin contacto"}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.row}>
            <Text>Validez</Text>
            <Text>{data.validity}</Text>
          </View>
          <View style={styles.row}>
            <Text>Moneda</Text>
            <Text>{data.currency}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Ítems</Text>
          <View style={styles.tableHeader}>
            <Text>Descripción</Text>
            <Text>Cant.</Text>
            <Text>Subtotal</Text>
          </View>
          {data.items.map((item) => (
            <View key={item.name} style={styles.tableRow}>
              <Text>{item.name}</Text>
              <Text>
                {item.quantity}
              </Text>
              <Text>
                {data.currency} {(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.row}>
            <Text>Subtotal</Text>
            <Text>
              {data.currency} {data.subtotal.toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Margen</Text>
            <Text>
              {data.currency} {data.margin.toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Impuestos</Text>
            <Text>
              {data.currency} {data.tax.toFixed(2)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>
              {data.currency} {data.total.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitle}>Condiciones</Text>
          <Text style={styles.muted}>{data.conditions}</Text>
        </View>
      </Page>
    </Document>
  )
}



