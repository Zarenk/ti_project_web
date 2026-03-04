import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { BACKEND_URL } from '@/lib/utils';
import { resolveLogoSrc, CompanyLogo } from './pdf-logo-helper';

const BACKEND_BASE_URL = BACKEND_URL;

/* ── 80mm ticket ≈ 227pt wide ── */
const TICKET_WIDTH = 227;
const TICKET_HEIGHT = 800;

const BORDER_COLOR = '#999';
const MUTED = '#555';

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
    marginBottom: 6,
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 1,
  },
  companyInfo: {
    fontSize: 7,
    textAlign: 'center',
    color: MUTED,
  },
  /* ── dividers ── */
  divider: {
    borderBottom: `1 dashed ${BORDER_COLOR}`,
    marginVertical: 4,
  },
  /* ── document title ── */
  titleBox: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  titleText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  serieText: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  /* ── client / meta ── */
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
    borderBottom: `1 solid ${BORDER_COLOR}`,
    paddingBottom: 2,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  colQty: { width: 24, fontSize: 7 },
  colDesc: { flex: 1, fontSize: 7, paddingRight: 4 },
  colPrice: { width: 40, fontSize: 7, textAlign: 'right' },
  colTotal: { width: 44, fontSize: 7, textAlign: 'right' },
  headerText: { fontSize: 7, fontWeight: 'bold' },
  /* ── totals ── */
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  totalLabel: { fontSize: 7 },
  totalValue: { fontSize: 7, textAlign: 'right', width: 60 },
  grandTotalLabel: { fontSize: 9, fontWeight: 'bold' },
  grandTotalValue: { fontSize: 9, fontWeight: 'bold', textAlign: 'right', width: 60 },
  /* ── importe en letras ── */
  letrasBox: {
    paddingVertical: 3,
  },
  letrasText: {
    fontSize: 6,
    textAlign: 'center',
    color: MUTED,
  },
  /* ── QR ── */
  qrSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  qrImage: {
    width: 55,
    height: 55,
  },
  qrCaption: {
    fontSize: 6,
    textAlign: 'center',
    color: MUTED,
    marginTop: 2,
  },
  /* ── series ── */
  seriesText: {
    fontSize: 6,
    color: MUTED,
  },
});

// resolveLogoSrc imported from pdf-logo-helper

export function TicketInvoiceDocument({
  data,
  qrCode,
  importeEnLetras,
}: {
  data: any;
  qrCode: string;
  importeEnLetras: string;
}) {
  const igv = data.items.reduce((acc: number, item: any) => acc + item.igv, 0);

  const documentTypeLabel =
    data.documentType === 'invoice' ? 'FACTURA' : data.documentType.toUpperCase();

  const moneda = data.tipoMoneda === 'PEN' ? 'S/' : '$';

  const pagos: { metodo: string; monto: number; moneda: string }[] =
    Array.isArray(data.pagos) ? data.pagos : [];

  const emitter = data?.emisor ?? {};
  const emitterName =
    emitter.razonSocial || emitter.nombre || emitter.businessName || emitter.companyName || '';
  const emitterAddress = emitter.address || emitter.adress || '';
  const emitterPhone = emitter.phone || emitter.telefono || null;
  const emitterRuc = emitter.ruc || emitter.taxId || emitter.sunatRuc || '—';
  const logoSrc = resolveLogoSrc(data.logoUrl ?? emitter.logoUrl ?? emitter.logo ?? null);

  return (
    <Document>
      <Page size={[TICKET_WIDTH, TICKET_HEIGHT]} style={s.page}>
        {/* ── Header: Logo + Empresa ── */}
        <View style={s.header}>
          <CompanyLogo src={logoSrc} size={40} />
          <Text style={s.companyName}>{emitterName}</Text>
          <Text style={s.companyInfo}>RUC: {emitterRuc}</Text>
          {emitterAddress ? <Text style={s.companyInfo}>{emitterAddress}</Text> : null}
          {emitterPhone ? <Text style={s.companyInfo}>Tel: {emitterPhone}</Text> : null}
        </View>

        <View style={s.divider} />

        {/* ── Document Title ── */}
        <View style={s.titleBox}>
          <Text style={s.titleText}>{documentTypeLabel} ELECTRÓNICA</Text>
          <Text style={s.serieText}>
            N° {data.serie}-{data.correlativo}
          </Text>
        </View>

        <View style={s.divider} />

        {/* ── Client Info ── */}
        <View style={{ marginBottom: 2 }}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Cliente:</Text>
            <Text style={s.metaValue}>{data.cliente.nombre || data.cliente.razonSocial || '—'}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Doc:</Text>
            <Text style={s.metaValue}>{data.cliente.dni || data.cliente.ruc || '—'}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Fecha:</Text>
            <Text style={s.metaValue}>{new Date(data.fechaEmision).toLocaleDateString()}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Moneda:</Text>
            <Text style={s.metaValue}>{data.tipoMoneda === 'PEN' ? 'SOLES' : data.tipoMoneda}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Items Table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.colQty, s.headerText]}>Cant.</Text>
          <Text style={[s.colDesc, s.headerText]}>Descripción</Text>
          <Text style={[s.colPrice, s.headerText]}>P.U.</Text>
          <Text style={[s.colTotal, s.headerText]}>Total</Text>
        </View>

        {data.items.map((item: any, idx: number) => (
          <View key={idx}>
            <View style={s.tableRow}>
              <Text style={s.colQty}>{item.cantidad}</Text>
              <Text style={s.colDesc}>{(item.descripcion || '').replace(/\\n/g, '\n')}</Text>
              <Text style={s.colPrice}>{item.precioUnitario.toFixed(2)}</Text>
              <Text style={s.colTotal}>{item.total.toFixed(2)}</Text>
            </View>
            {item.series && item.series.length > 0 && (
              <Text style={s.seriesText}>
                {'  '}S/N: {item.series.join(', ')}
              </Text>
            )}
          </View>
        ))}

        <View style={s.divider} />

        {/* ── Totals ── */}
        <View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Gravada</Text>
            <Text style={s.totalValue}>{moneda} {(data.total / 1.18).toFixed(2)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>IGV (18%)</Text>
            <Text style={s.totalValue}>{moneda} {igv.toFixed(2)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.grandTotalLabel}>TOTAL</Text>
            <Text style={s.grandTotalValue}>{moneda} {data.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Forma de pago ── */}
        <View style={s.divider} />
        <View style={{ marginBottom: 2 }}>
          <Text style={{ fontSize: 7, fontWeight: 'bold' }}>
            FORMA DE PAGO: {pagos.length > 0 ? pagos.map((p) => p.metodo).join(' / ') : 'CONTADO'}
          </Text>
          {pagos.length > 1 && pagos.map((p, i) => (
            <Text key={i} style={{ fontSize: 7, color: MUTED }}>
              {p.metodo}: {moneda} {p.monto.toFixed(2)}
            </Text>
          ))}
        </View>

        <View style={s.divider} />

        {/* ── Importe en letras ── */}
        <View style={s.letrasBox}>
          <Text style={s.letrasText}>SON: {(importeEnLetras || 'N/A').replace(/^IMPORTE EN LETRAS:\s*/i, '')}</Text>
        </View>

        <View style={s.divider} />

        {/* ── QR ── */}
        {qrCode && (
          <View style={s.qrSection}>
            <Image src={qrCode} style={s.qrImage} />
            <Text style={s.qrCaption}>
              Representación impresa de la {documentTypeLabel} Electrónica
            </Text>
            <Text style={s.qrCaption}>
              N° {data.serie}-{data.correlativo}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
