import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    color: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderBottom: '1px solid #aaa',
    paddingBottom: 10,
  },
  leftColumn: {
    width: '60%',
  },
  rightColumn: {
    width: '40%',
    alignItems: 'flex-end',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 5,
  },
  companyName: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  rucText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  invoiceBox: {
    border: '1px solid #aaa',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  titleBox: {
    backgroundColor: '#0B2B66',
    padding: 6,
    borderRadius: 4,
    marginBottom: 4,
    width: '100%',
    alignItems: 'center',
  },
  titleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  table: {
    border: '1px solid #aaa',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0B2B66',
    color: '#fff',
    fontWeight: 'bold',
    padding: 6,
    borderBottom: '1px solid #aaa',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1px solid #ccc',
    alignItems: 'center', // nuevo para centrar verticalmente
  },
  cell: {
    flex: 1,
    textAlign: 'left',
  },
  totalsRight: {
    marginTop: 10,
    padding: 6,
    border: '1px solid #000',
    borderRadius: 4,
    width: '50%',
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 2,
  },
  importeBox: {
    marginTop: 10,
    padding: 6,
    backgroundColor: '#f2f2f2',
    border: '1px solid #ccc',
    fontStyle: 'italic',
  },
  qrSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrImage: {
    width: 80,
    height: 80,
  },
  clienteFechaWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 0, // elimina el espacio entre los boxes
  },
  box: {
    border: '1px solid #aaa',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    width: '60%',
    height: 112, // altura alineada
    justifyContent: 'flex-start', // alinea contenido arriba
  },
  fechaBox: {
    border: '1px solid #aaa',
    borderRadius: 4,
    padding: 8,
    width: '40%',
    height: 112, // misma altura
    justifyContent: 'flex-start', // alinea contenido arriba
  },
  
  rowField: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 2,
    alignItems: 'center',
  },
  labelTotal: {
    width: 90,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  label: {
    width: 90,
    textAlign: 'right',
  },
  labelBox: {
    width: 90,
    textAlign: 'left',
  },
  value: {
    width: 60,
    textAlign: 'right',
  },
  colon: {
    width: 10,
    textAlign: 'center',
  },
  currency: {
    width: 25,
    textAlign: 'right',
  },
  cellCenter: {
    flex: 1,
    textAlign: 'center',  // nuevo para centrar horizontalmente
  },
  // NUEVO ESTILO para valores alineados a la izquierda (solo para box y fechaBox)
  valueLeft: {
    flex: 1,
    textAlign: 'left',
  },
  rowFieldLeft: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-start',
  },
  observaciones: {
    fontSize: 7,
    marginTop: 10,
    marginLeft: 20,
    lineHeight: 1.2,
  },
});

export function InvoiceDocument({
  data,
  qrCode,
  importeEnLetras,
}: {
  data: any;
  qrCode: string;
  importeEnLetras: string;
}) {
  const subtotal = data.items.reduce(
    (acc: number, item: any) => acc + item.subTotal,
    0,
  );
  const igv = data.items.reduce((acc: number, item: any) => acc + item.igv, 0);

  const documentTypeLabel =
    data.documentType === 'invoice' ? 'FACTURA' : data.documentType.toUpperCase();

  const Moneda =
  data.tipoMoneda === 'PEN' ? 'SOLES' : data.tipoMoneda.toUpperCase();

  const direccionFormateada = (data.cliente.direccion || 'N/A').replace(
    /(.{40})/g,
    '$1\n'
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.leftColumn}>
            <Image src="/logo_ti.png" style={styles.logo} />
            <Text style={styles.companyName}>TEGNOLOGIA INFORMATICA EIRL</Text>
            <Text>
              AV. CORONEL MENDOZA 1945 INT. K367 AS.C.C MERCADILLO{"\n"}
              BOLOGNESI - TACNA - TACNA - TACNA
            </Text>
            <Text>
              TELEFONO: 052-413038{"\n"}
            </Text>
          </View>
          <View style={styles.rightColumn}>
            <View style={styles.invoiceBox}>
              <Text style={styles.rucText}>RUC: 20519857538</Text>
              <View style={styles.titleBox}>
                <Text style={styles.titleText}>
                  {documentTypeLabel} ELECTRÓNICA
                </Text>
              </View>
              <Text style={{ fontSize: 12 }}>
                N° {data.serie}-{data.correlativo}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.clienteFechaWrapper}>
        <View style={styles.box}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Datos del Cliente:</Text>
            <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Documento</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>{data.cliente.dni || data.cliente.ruc}</Text>
            </View>
            <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Nombre</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>{data.cliente.nombre || data.cliente.razonSocial}</Text>
            </View>
            <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Dirección</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>{direccionFormateada}</Text>
            </View>
        </View>

        <View style={styles.fechaBox}>
            <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Fecha de Emisión</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>{new Date(data.fechaEmision).toLocaleDateString()}</Text>
            </View>
            <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Fecha de Vencimiento</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>{new Date(data.fechaEmision).toLocaleDateString()}</Text>
            </View>
            <View style={styles.rowFieldLeft}>
            <Text style={styles.labelBox}>Moneda</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.valueLeft}>{Moneda}</Text>
            </View>
        </View>
        </View>

        {/* Tabla de productos */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellCenter}>Cantidad</Text>
            <Text style={styles.cellCenter}>UM</Text>
            <Text style={[styles.cell, { flex: 3 }]}>Descripción</Text>
            <Text style={styles.cell}>V/U</Text>
            <Text style={styles.cell}>P/U</Text>
            <Text style={styles.cell}>Total</Text>
          </View>
          {data.items.map((item: any, idx: number) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={styles.cellCenter}>{item.cantidad}</Text>
              <Text style={styles.cellCenter}>NIU</Text>
              <Text style={[styles.cell, { flex: 3 }]}>
                {(item.descripcion || '').replace(/\\n/g, '\n')}
                {item.series && item.series.length > 0 && (
                  <Text style={{ fontSize: 9 }}>
                    {"\n"}
                    {item.series.length === 1 ? 'SERIE N°:\n' : 'SERIES N°:\n'}
                    {item.series.join(', ')}
                  </Text>
                )}
              </Text>
              <Text style={styles.cell}>{(item.precioUnitario / 1.18).toFixed(2)}</Text>
              <Text style={styles.cell}>{item.precioUnitario.toFixed(2)}</Text>
              <Text style={styles.cell}>{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totalsRight}>
        <View style={styles.rowField}>
            <Text style={styles.label}>GRAVADA</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.currency}>S/.</Text>
            <Text style={styles.value}>{(data.total / 1.18).toFixed(2)}</Text>
        </View>
        <View style={styles.rowField}>
            <Text style={styles.label}>IGV (18%)</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.currency}>S/.</Text>
            <Text style={styles.value}>{igv.toFixed(2)}</Text>
        </View>
        <View style={styles.rowField}>
            <Text style={styles.labelTotal}>TOTAL</Text>
            <Text style={styles.colon}>:</Text>
            <Text style={styles.currency}>S/.</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>
            {data.total.toFixed(2)}
            </Text>
        </View>
        </View>

        {/* Importe en letras */}
        <View style={styles.importeBox}>
          <Text>{importeEnLetras || 'N/A'}</Text>
        </View>

        <View>
        <Text style={styles.observaciones}>
            OBSERVACIONES: PAGO AL CONTADO - TRANSFERENCIA BANCARIA
        </Text>
        <Text style={styles.observaciones}>
            FORMA DE PAGO: [CONTADO]
        </Text>
        </View>

        {/* QR */}
        <View style={styles.qrSection}>
          <View>
            <Text style={{ fontSize: 9 }}>
              Representación impresa de la {documentTypeLabel} ELECTRÓNICA
            </Text>
            <Text style={{ fontSize: 9 }}>
              N° {data.serie}-{data.correlativo}
            </Text>
          </View>
          {qrCode && <Image src={qrCode} style={styles.qrImage} />}
        </View>
      </Page>
    </Document>
  );
}