"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import type { ComplaintItem } from "../libro-reclamaciones.api"

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 2,
  },
  correlative: {
    fontSize: 10,
    textAlign: "right",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f0f0f0",
    padding: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    width: 130,
  },
  value: {
    flex: 1,
  },
  detailBox: {
    border: "1 solid #ccc",
    padding: 8,
    marginTop: 4,
    marginBottom: 4,
    minHeight: 60,
  },
  footer: {
    marginTop: 16,
    fontSize: 7,
    color: "#666",
    borderTop: "1 solid #ccc",
    paddingTop: 8,
  },
  signatureLine: {
    marginTop: 30,
    borderTop: "1 solid #333",
    width: 200,
    textAlign: "center",
    paddingTop: 4,
    fontSize: 8,
  },
  providerBox: {
    border: "1 solid #ccc",
    padding: 8,
    marginBottom: 4,
  },
})

interface Props {
  complaint: ComplaintItem
}

export function ComplaintSheetPdf({ complaint }: Props) {
  const createdDate = new Date(complaint.createdAt)
  const day = String(createdDate.getDate()).padStart(2, "0")
  const month = String(createdDate.getMonth() + 1).padStart(2, "0")
  const year = String(createdDate.getFullYear())

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <Text style={s.title}>LIBRO DE RECLAMACIONES</Text>
        <Text style={s.subtitle}>HOJA DE RECLAMACION</Text>
        <Text style={s.correlative}>
          N° {complaint.correlativeNumber}
        </Text>

        {/* Date */}
        <View style={s.row}>
          <Text style={s.label}>FECHA:</Text>
          <Text style={s.value}>
            {day} / {month} / {year}
          </Text>
        </View>

        {/* Provider data */}
        <View style={s.providerBox}>
          <View style={s.row}>
            <Text style={s.label}>Razon Social:</Text>
            <Text style={s.value}>{complaint.providerLegalName}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>RUC:</Text>
            <Text style={s.value}>{complaint.providerRuc}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Domicilio:</Text>
            <Text style={s.value}>{complaint.providerAddress}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Codigo de Identificacion:</Text>
            <Text style={s.value}>{complaint.trackingCode}</Text>
          </View>
        </View>

        {/* Section 1 */}
        <Text style={s.sectionTitle}>
          1. IDENTIFICACION DEL CONSUMIDOR RECLAMANTE
        </Text>
        <View style={s.row}>
          <Text style={s.label}>NOMBRE:</Text>
          <Text style={s.value}>{complaint.consumerName}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>DOMICILIO:</Text>
          <Text style={s.value}>{complaint.consumerAddress || "-"}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>
            {complaint.consumerDocType}:
          </Text>
          <Text style={{ width: 100 }}>{complaint.consumerDocNumber}</Text>
          <Text style={s.label}>TELEFONO / E-MAIL:</Text>
          <Text style={s.value}>
            {complaint.consumerPhone || ""}{" "}
            {complaint.consumerEmail}
          </Text>
        </View>
        {complaint.isMinor && complaint.parentName && (
          <View style={s.row}>
            <Text style={s.label}>PADRE O MADRE:</Text>
            <Text style={s.value}>{complaint.parentName}</Text>
          </View>
        )}

        {/* Section 2 */}
        <Text style={s.sectionTitle}>
          2. IDENTIFICACION DEL BIEN CONTRATADO
        </Text>
        <View style={s.row}>
          <Text style={s.label}>
            {complaint.goodType === "PRODUCTO" ? "[X] PRODUCTO" : "[ ] PRODUCTO"}
          </Text>
          <Text style={s.label}>
            {complaint.goodType === "SERVICIO" ? "[X] SERVICIO" : "[ ] SERVICIO"}
          </Text>
          <Text style={s.label}>MONTO RECLAMADO:</Text>
          <Text style={s.value}>
            {complaint.claimedAmount
              ? `${complaint.amountCurrency} ${complaint.claimedAmount}`
              : "-"}
          </Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>DESCRIPCION:</Text>
          <Text style={s.value}>{complaint.goodDescription}</Text>
        </View>

        {/* Section 3 */}
        <Text style={s.sectionTitle}>
          3. DETALLE DE LA RECLAMACION Y PEDIDO DEL CONSUMIDOR
        </Text>
        <View style={s.row}>
          <Text style={s.label}>
            {complaint.complaintType === "RECLAMO" ? "[X] RECLAMO" : "[ ] RECLAMO"}
          </Text>
          <Text style={s.label}>
            {complaint.complaintType === "QUEJA" ? "[X] QUEJA" : "[ ] QUEJA"}
          </Text>
        </View>
        <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 4 }}>
          DETALLE:
        </Text>
        <View style={s.detailBox}>
          <Text>{complaint.detail}</Text>
        </View>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>PEDIDO:</Text>
        <View style={s.detailBox}>
          <Text>{complaint.consumerRequest}</Text>
        </View>

        <View style={{ alignItems: "flex-end", marginTop: 8 }}>
          <View style={s.signatureLine}>
            <Text>FIRMA DEL CONSUMIDOR</Text>
          </View>
        </View>

        {/* Section 4 */}
        <Text style={s.sectionTitle}>
          4. OBSERVACIONES Y ACCIONES ADOPTADAS POR EL PROVEEDOR
        </Text>
        {complaint.responseText ? (
          <>
            <View style={s.detailBox}>
              <Text>{complaint.responseText}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>
                FECHA DE COMUNICACION DE LA RESPUESTA:
              </Text>
              <Text style={s.value}>
                {complaint.responseDate
                  ? new Date(complaint.responseDate).toLocaleDateString("es-PE")
                  : "-"}
              </Text>
            </View>
          </>
        ) : (
          <View style={[s.detailBox, { minHeight: 40 }]}>
            <Text style={{ color: "#999" }}>(Pendiente de respuesta)</Text>
          </View>
        )}

        <View style={{ alignItems: "flex-end", marginTop: 8 }}>
          <View style={s.signatureLine}>
            <Text>FIRMA DEL PROVEEDOR</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text>
            RECLAMO: Disconformidad relacionada a los productos o servicios.
          </Text>
          <Text>
            QUEJA: Disconformidad no relacionada a los productos o servicios;
            o, malestar o descontento respecto a la atencion al publico.
          </Text>
          <Text style={{ marginTop: 4 }}>
            Destinatario (consumidor, proveedor o INDECOPI segun corresponda)
          </Text>
          <Text style={{ marginTop: 4 }}>
            *La formulacion del reclamo no impide acudir a otras vias de
            solucion de controversias ni es requisito previo para interponer una
            denuncia ante el INDECOPI.
          </Text>
          <Text>
            *El proveedor debe dar respuesta al reclamo o queja en un plazo no
            mayor a quince (15) dias habiles, el cual es improrrogable.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
