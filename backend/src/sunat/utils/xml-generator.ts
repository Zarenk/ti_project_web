import { create } from 'xmlbuilder2';

type UblDocumentKind = 'invoice' | 'boleta' | 'creditNote';

const SUNAT_DOC_TYPES: Record<UblDocumentKind, string> = {
  invoice: '01',
  boleta: '03',
  creditNote: '07',
};

const SUNAT_DOC_TYPE_NAMESPACES: Record<
  UblDocumentKind,
  { root: string; xmlns: string; schemaLocation: string }
> = {
  invoice: {
    root: 'Invoice',
    xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    schemaLocation:
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd',
  },
  boleta: {
    root: 'Invoice',
    xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    schemaLocation:
      'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd',
  },
  creditNote: {
    root: 'CreditNote',
    xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
    schemaLocation:
      'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2 UBL-CreditNote-2.1.xsd',
  },
};

const DEFAULT_IGV_RATE = 0.18;

function formatDate(input?: string | Date | null): string {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }
  if (input instanceof Date) {
    return input.toISOString().slice(0, 10);
  }
  if (typeof input === 'string' && input.includes('T')) {
    return input.slice(0, 10);
  }
  return String(input);
}

function formatTime(input?: string | Date | null): string | null {
  if (!input) {
    return null;
  }
  if (input instanceof Date) {
    return input.toISOString().slice(11, 19);
  }
  if (typeof input === 'string' && input.includes('T')) {
    return input.slice(11, 19);
  }
  return null;
}

function resolveCustomerDocType(cliente: any): { tipo: string; numero: string } {
  const tipoDocumento = String(cliente?.tipoDocumento ?? '').toUpperCase();
  const numero =
    cliente?.ruc ??
    cliente?.dni ??
    cliente?.numeroDocumento ??
    cliente?.documento ??
    '00000000';

  if (tipoDocumento === 'RUC') return { tipo: '6', numero: String(numero) };
  if (tipoDocumento === 'DNI') return { tipo: '1', numero: String(numero) };
  if (tipoDocumento === 'CE') return { tipo: '4', numero: String(numero) };
  if (tipoDocumento === 'PAS') return { tipo: '7', numero: String(numero) };

  const numStr = String(numero);
  if (numStr.length === 11) {
    return { tipo: '6', numero: numStr };
  }

  return { tipo: '1', numero: numStr };
}

function normalizeAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeItem(item: any) {
  const quantity = normalizeAmount(item?.cantidad ?? 0);
  const unitPriceWithTax = normalizeAmount(
    item?.precioUnitario ?? item?.price ?? 0,
  );
  const total = round2(
    normalizeAmount(item?.total ?? (unitPriceWithTax * quantity || 0)),
  );

  // Always recalculate base and IGV from total to guarantee consistency.
  // subtotal (base gravada) = total / (1 + IGV_RATE), rounded to 2 decimals.
  // igv = total - subtotal, so they always add up exactly.
  const subtotal = total > 0 ? round2(total / (1 + DEFAULT_IGV_RATE)) : 0;
  const igv = total > 0 ? round2(total - subtotal) : 0;

  const unitPriceWithoutTax =
    quantity > 0 ? round2(subtotal / quantity) : unitPriceWithTax;

  return {
    descripcion: String(item?.descripcion ?? item?.name ?? ''),
    cantidad: quantity,
    subtotal,
    igv,
    total,
    unitPriceWithTax,
    unitPriceWithoutTax,
    unitCode: String(item?.unitCode ?? 'NIU'),
  };
}

function calculateTotals(items: ReturnType<typeof normalizeItem>[]) {
  const raw = items.reduce(
    (acc, item) => {
      acc.subtotal += item.subtotal;
      acc.igv += item.igv;
      acc.total += item.total;
      return acc;
    },
    { subtotal: 0, igv: 0, total: 0 },
  );
  // Round sums to avoid floating-point accumulation drift
  raw.subtotal = round2(raw.subtotal);
  raw.igv = round2(raw.igv);
  raw.total = round2(raw.total);
  return raw;
}

function appendUBLExtensions(doc: any) {
  doc
    .ele('ext:UBLExtensions')
    .ele('ext:UBLExtension')
    .ele('ext:ExtensionContent')
    .ele('<__raw><!-- Firma digital no disponible --></__raw>')
    .up()
    .up()
    .up();
}

function appendSupplier(doc: any, data: any) {
  const ruc = data?.emisor?.ruc ?? '';
  const razonSocial =
    data?.emisor?.razonSocial ?? data?.emisor?.nombre ?? '';
  const direccion = data?.emisor?.direccion ?? '';
  const ubigeo = data?.emisor?.ubigeo ?? '';
  const urbanizacion = data?.emisor?.urbanizacion ?? '';
  const departamento = data?.emisor?.departamento ?? '';
  const provincia = data?.emisor?.provincia ?? '';
  const distrito = data?.emisor?.distrito ?? '';
  const codigoLocalAnexo = data?.emisor?.codigoLocalAnexo ?? '0000';

  const party = doc
    .ele('cac:AccountingSupplierParty')
    .ele('cac:Party');

  party
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', {
      schemeID: '6',
      schemeName: 'Documento de Identidad',
      schemeAgencyName: 'PE:SUNAT',
    })
    .txt(String(ruc))
    .up()
    .up();

  party
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(String(razonSocial))
    .up()
    .up();

  const legalEntity = party.ele('cac:PartyLegalEntity');
  legalEntity
    .ele('cbc:RegistrationName')
    .txt(String(razonSocial))
    .up();

  const regAddress = legalEntity.ele('cac:RegistrationAddress');
  regAddress
    .ele('cbc:ID')
    .txt(String(ubigeo || '150101'))
    .up();
  regAddress
    .ele('cbc:AddressTypeCode')
    .txt(String(codigoLocalAnexo))
    .up();
  if (urbanizacion) {
    regAddress
      .ele('cbc:CitySubdivisionName')
      .txt(String(urbanizacion))
      .up();
  }
  if (distrito) {
    regAddress.ele('cbc:CityName').txt(String(distrito)).up();
  }
  if (provincia) {
    regAddress.ele('cbc:CountrySubentity').txt(String(provincia)).up();
  }
  if (departamento) {
    regAddress.ele('cbc:District').txt(String(departamento)).up();
  }
  if (direccion) {
    regAddress
      .ele('cac:AddressLine')
      .ele('cbc:Line')
      .txt(String(direccion))
      .up()
      .up();
  }
  regAddress
    .ele('cac:Country')
    .ele('cbc:IdentificationCode')
    .txt('PE')
    .up()
    .up();

  regAddress.up(); // close RegistrationAddress
  legalEntity.up(); // close PartyLegalEntity
  party.up(); // close Party
  // AccountingSupplierParty auto-closed
}

function appendCustomer(doc: any, data: any) {
  const cliente = data?.cliente ?? {};
  const customer = resolveCustomerDocType(cliente);
  const razonSocial =
    cliente?.razonSocial ?? cliente?.nombre ?? 'CLIENTE';
  doc
    .ele('cac:AccountingCustomerParty')
    .ele('cac:Party')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID', {
      schemeID: customer.tipo,
      schemeName: 'Documento de Identidad',
      schemeAgencyName: 'PE:SUNAT',
    })
    .txt(customer.numero)
    .up()
    .up()
    .ele('cac:PartyLegalEntity')
    .ele('cbc:RegistrationName')
    .txt(String(razonSocial))
    .up()
    .up()
    .up();
}

function appendSignatureMetadata(doc: any, data: any) {
  const ruc = data?.emisor?.ruc ?? '';
  const razonSocial =
    data?.emisor?.razonSocial ?? data?.emisor?.nombre ?? '';
  doc
    .ele('cac:Signature')
    .ele('cbc:ID')
    .txt(String(ruc))
    .up()
    .ele('cac:SignatoryParty')
    .ele('cac:PartyIdentification')
    .ele('cbc:ID')
    .txt(String(ruc))
    .up()
    .up()
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(String(razonSocial))
    .up()
    .up()
    .up()
    .ele('cac:DigitalSignatureAttachment')
    .ele('cac:ExternalReference')
    .ele('cbc:URI')
    .txt('#SignatureKG')
    .up()
    .up()
    .up()
    .up();
}

function appendTaxTotal(doc: any, currency: string, totals: any) {
  doc
    .ele('cac:TaxTotal')
    .ele('cbc:TaxAmount', { currencyID: currency })
    .txt(totals.igv.toFixed(2))
    .up()
    .ele('cac:TaxSubtotal')
    .ele('cbc:TaxableAmount', { currencyID: currency })
    .txt(totals.subtotal.toFixed(2))
    .up()
    .ele('cbc:TaxAmount', { currencyID: currency })
    .txt(totals.igv.toFixed(2))
    .up()
    .ele('cac:TaxCategory')
    .ele('cbc:ID')
    .txt('S')
    .up()
    .ele('cbc:Percent')
    .txt((DEFAULT_IGV_RATE * 100).toFixed(2))
    .up()
    .ele('cbc:TaxExemptionReasonCode')
    .txt('10')
    .up()
    .ele('cac:TaxScheme')
    .ele('cbc:ID')
    .txt('1000')
    .up()
    .ele('cbc:Name')
    .txt('IGV')
    .up()
    .ele('cbc:TaxTypeCode')
    .txt('VAT')
    .up()
    .up()
    .up()
    .up()
    .up();
}

function appendLegalTotal(doc: any, currency: string, totals: any) {
  doc
    .ele('cac:LegalMonetaryTotal')
    .ele('cbc:LineExtensionAmount', { currencyID: currency })
    .txt(totals.subtotal.toFixed(2))
    .up()
    .ele('cbc:TaxInclusiveAmount', { currencyID: currency })
    .txt(totals.total.toFixed(2))
    .up()
    .ele('cbc:PayableAmount', { currencyID: currency })
    .txt(totals.total.toFixed(2))
    .up()
    .up();
}

function appendInvoiceLine(
  doc: any,
  index: number,
  item: ReturnType<typeof normalizeItem>,
  currency: string,
  isCreditNote: boolean,
) {
  const line = doc.ele(isCreditNote ? 'cac:CreditNoteLine' : 'cac:InvoiceLine');
  line.ele('cbc:ID').txt(String(index + 1)).up();
  if (isCreditNote) {
    line
      .ele('cbc:CreditedQuantity', { unitCode: item.unitCode })
      .txt(String(item.cantidad))
      .up();
  } else {
    line
      .ele('cbc:InvoicedQuantity', { unitCode: item.unitCode })
      .txt(String(item.cantidad))
      .up();
  }

  line
    .ele('cbc:LineExtensionAmount', { currencyID: currency })
    .txt(item.subtotal.toFixed(2))
    .up()
    .ele('cac:PricingReference')
    .ele('cac:AlternativeConditionPrice')
    .ele('cbc:PriceAmount', { currencyID: currency })
    .txt(item.unitPriceWithTax.toFixed(2))
    .up()
    .ele('cbc:PriceTypeCode')
    .txt('01')
    .up()
    .up()
    .up()
    .ele('cac:TaxTotal')
    .ele('cbc:TaxAmount', { currencyID: currency })
    .txt(item.igv.toFixed(2))
    .up()
    .ele('cac:TaxSubtotal')
    .ele('cbc:TaxableAmount', { currencyID: currency })
    .txt(item.subtotal.toFixed(2))
    .up()
    .ele('cbc:TaxAmount', { currencyID: currency })
    .txt(item.igv.toFixed(2))
    .up()
    .ele('cac:TaxCategory')
    .ele('cbc:ID')
    .txt('S')
    .up()
    .ele('cbc:Percent')
    .txt((DEFAULT_IGV_RATE * 100).toFixed(2))
    .up()
    .ele('cbc:TaxExemptionReasonCode')
    .txt('10')
    .up()
    .ele('cac:TaxScheme')
    .ele('cbc:ID')
    .txt('1000')
    .up()
    .ele('cbc:Name')
    .txt('IGV')
    .up()
    .ele('cbc:TaxTypeCode')
    .txt('VAT')
    .up()
    .up()
    .up()
    .up()
    .up()
    .ele('cac:Item')
    .ele('cbc:Description')
    .txt(item.descripcion)
    .up()
    .up()
    .ele('cac:Price')
    .ele('cbc:PriceAmount', { currencyID: currency })
    .txt(item.unitPriceWithoutTax.toFixed(2))
    .up()
    .up()
    .up();
}

function buildBaseDocument(
  data: any,
  kind: UblDocumentKind,
): {
  doc: any;
  currency: string;
  items: ReturnType<typeof normalizeItem>[];
  totals: { subtotal: number; igv: number; total: number };
} {
  const meta = SUNAT_DOC_TYPE_NAMESPACES[kind];
  const currency = data?.tipoMoneda ?? 'PEN';
  const serie = data?.serie ?? '000';
  const correlativo = data?.correlativo ?? '000000';
  const issueDate = formatDate(data?.fechaEmision ?? data?.issueDate ?? null);
  const issueTime = formatTime(data?.fechaEmision ?? data?.issueTime ?? null);
  const items = Array.isArray(data?.items)
    ? data.items.map(normalizeItem)
    : [];

  // Header totals MUST equal sum of line totals — SUNAT validates this (error 3277).
  // Never override subtotal/igv independently; they must match line-level calculations.
  const totals = calculateTotals(items);

  const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele(meta.root, {
    xmlns: meta.xmlns,
    'xmlns:cac':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'xmlns:cbc':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    'xmlns:ext':
      'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    'xsi:schemaLocation': meta.schemaLocation,
  });

  appendUBLExtensions(doc);

  doc.ele('cbc:UBLVersionID').txt('2.1').up();
  doc.ele('cbc:CustomizationID').txt('2.0').up();

  if (kind !== 'creditNote') {
    const tipoOperacion = data?.tipoOperacion ?? data?.operationType ?? '0101';
    doc
      .ele('cbc:ProfileID', {
        schemeName: 'Tipo de Operacion',
        schemeAgencyName: 'PE:SUNAT',
        schemeURI:
          'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo17',
      })
      .txt(String(tipoOperacion))
      .up();
  }

  doc.ele('cbc:ID').txt(`${serie}-${correlativo}`).up();
  doc.ele('cbc:IssueDate').txt(issueDate).up();
  if (issueTime) {
    doc.ele('cbc:IssueTime').txt(issueTime).up();
  }

  if (kind !== 'creditNote') {
    const tipoOp = data?.tipoOperacion ?? data?.operationType ?? '0101';
    doc
      .ele('cbc:InvoiceTypeCode', {
        listAgencyName: 'PE:SUNAT',
        listName: 'Tipo de Documento',
        listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
        listID: String(tipoOp),
        listSchemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51',
      })
      .txt(SUNAT_DOC_TYPES[kind])
      .up();
  } else {
    const tipoNota = String(
      data?.creditNoteTypeCode ??
        data?.codigoMotivo ??
        data?.tipoNotaCredito ??
        '01',
    );
    doc
      .ele('cbc:CreditNoteTypeCode', {
        listAgencyName: 'PE:SUNAT',
        listName: 'Tipo de Nota de Credito',
        listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo09',
      })
      .txt(tipoNota)
      .up();
  }

  if (data?.importeEnLetras || data?.totalTexto) {
    doc
      .ele('cbc:Note', { languageLocaleID: '1000' })
      .txt(String(data?.importeEnLetras ?? data?.totalTexto))
      .up();
  }

  doc
    .ele('cbc:DocumentCurrencyCode', {
      listID: 'ISO 4217 Alpha',
      listAgencyName: 'United Nations Economic Commission for Europe',
      listName: 'Currency',
    })
    .txt(currency)
    .up();

  // For credit notes, DiscrepancyResponse and BillingReference must appear
  // BEFORE Signature/Supplier/Customer per UBL 2.1 schema.
  // So we skip these here and let generateCreditNoteXML handle the order.
  if (kind !== 'creditNote') {
    appendSignatureMetadata(doc, data);
    appendSupplier(doc, data);
    appendCustomer(doc, data);
  }

  return { doc, currency, items, totals };
}

export function generateInvoiceXML(data: any): string {
  const { doc, currency, items, totals } = buildBaseDocument(data, 'invoice');

  // PaymentTerms — obligatorio para facturas (RS 000193-2020/SUNAT)
  // Default: "Contado" para ventas al contado del POS
  const formaPago = data?.formaPago ?? 'Contado';
  const paymentTerms = doc.ele('cac:PaymentTerms');
  paymentTerms.ele('cbc:ID').txt('FormaPago').up();
  paymentTerms.ele('cbc:PaymentMeansID').txt(formaPago).up();
  if (formaPago === 'Credito' && totals.total > 0) {
    paymentTerms
      .ele('cbc:Amount', { currencyID: currency })
      .txt(totals.total.toFixed(2))
      .up();
  }
  paymentTerms.up();

  appendTaxTotal(doc, currency, totals);
  appendLegalTotal(doc, currency, totals);

  items.forEach((item, index) =>
    appendInvoiceLine(doc, index, item, currency, false),
  );

  return doc.end({ prettyPrint: false });
}

export function generateBoletaXML(data: any): string {
  const { doc, currency, items, totals } = buildBaseDocument(data, 'boleta');

  // PaymentTerms — obligatorio para boletas > 700 PEN con crédito
  const formaPago = data?.formaPago ?? 'Contado';
  const pt = doc.ele('cac:PaymentTerms');
  pt.ele('cbc:ID').txt('FormaPago').up();
  pt.ele('cbc:PaymentMeansID').txt(formaPago).up();
  if (formaPago === 'Credito' && totals.total > 0) {
    pt.ele('cbc:Amount', { currencyID: currency })
      .txt(totals.total.toFixed(2))
      .up();
  }
  pt.up();

  appendTaxTotal(doc, currency, totals);
  appendLegalTotal(doc, currency, totals);

  items.forEach((item, index) =>
    appendInvoiceLine(doc, index, item, currency, false),
  );

  return doc.end({ prettyPrint: false });
}

export function generateCreditNoteXML(data: any): string {
  const { doc, currency, items, totals } = buildBaseDocument(
    data,
    'creditNote',
  );

  const refDoc = data?.documentoModificado ?? data?.affectedDocument ?? null;
  if (!refDoc?.serie || !refDoc?.correlativo) {
    throw new Error(
      'documentoModificado con serie y correlativo es requerido para nota de credito.',
    );
  }
  const refTipo = String(refDoc?.tipo ?? refDoc?.tipoComprobante ?? '01');
  const refId = `${refDoc.serie}-${refDoc.correlativo}`;
  const motivo =
    refDoc?.motivo ?? data?.motivo ?? 'Anulacion de la operacion';

  // UBL 2.1 CreditNote order: DiscrepancyResponse → BillingReference →
  // Signature → Supplier → Customer → TaxTotal → LegalMonetaryTotal → Lines
  doc
    .ele('cac:DiscrepancyResponse')
    .ele('cbc:ReferenceID')
    .txt(refId)
    .up()
    .ele('cbc:ResponseCode')
    .txt(String(data?.creditNoteTypeCode ?? data?.codigoMotivo ?? '01'))
    .up()
    .ele('cbc:Description')
    .txt(String(motivo))
    .up()
    .up()
    .ele('cac:BillingReference')
    .ele('cac:InvoiceDocumentReference')
    .ele('cbc:ID')
    .txt(refId)
    .up()
    .ele('cbc:DocumentTypeCode', {
      listAgencyName: 'PE:SUNAT',
      listName: 'Tipo de Documento',
      listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
    })
    .txt(refTipo)
    .up()
    .up()
    .up();

  // Now append Signature/Supplier/Customer (skipped in buildBaseDocument for creditNote)
  appendSignatureMetadata(doc, data);
  appendSupplier(doc, data);
  appendCustomer(doc, data);

  appendTaxTotal(doc, currency, totals);
  appendLegalTotal(doc, currency, totals);

  items.forEach((item, index) =>
    appendInvoiceLine(doc, index, item, currency, true),
  );

  return doc.end({ prettyPrint: false });
}
