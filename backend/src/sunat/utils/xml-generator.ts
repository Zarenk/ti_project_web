import { Builder } from 'xml2js';

/**
 * Genera el XML base para documentos UBL 2.1.
 */

function generateBaseXML(data: any, documentType: string): any {

  // Contenido original de __raw
  const rawContent = '<!-- Firma digital no disponible -->';

  return {
    [documentType]: {
      $: {
        xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        'xmlns:ext':'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
        'xmlns:ds':'http://www.w3.org/2000/09/xmldsig#',
        'xmlns:xsi':"http://www.w3.org/2001/XMLSchema-instance",
        'xsi:schemaLocation':'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd',
      },
      'ext:UBLExtensions': [
        {
          'ext:UBLExtension': {
            'ext:ExtensionContent': {
              __raw: '<!-- Firma digital no disponible -->'
            },
          },
        },
      ],
      'cbc:UBLVersionID': '2.1',
      'cbc:CustomizationID': '2.0',
      'cbc:ID': `${data.serie}-${data.correlativo}`,
      'cbc:InvoiceTypeCode': documentType === 'Invoice' ? '01' : (documentType === 'CreditNote' ? '07' : '03'),
      'cbc:IssueDate': data.fechaEmision,
      'cbc:DocumentCurrencyCode': data.tipoMoneda,
      'cac:AccountingSupplierParty': {
        'cbc:CustomerAssignedAccountID': data.emisor.ruc,
        'cbc:AdditionalAccountID': '6',
        'cac:Party': {
          'cac:PartyName': {
            'cbc:Name': data.emisor.razonSocial,
          },
        },
      },
      'cac:AccountingCustomerParty': {
        'cbc:CustomerAssignedAccountID': data.cliente.ruc,
        'cbc:AdditionalAccountID': '6',
        'cac:Party': {
          'cac:PartyName': {
            'cbc:Name': data.cliente.razonSocial,
          },
        },
      },
      'cac:TaxTotal': {
        'cbc:TaxAmount': { _: '18.00', $: { currencyID: data.tipoMoneda } },
      },
      'cac:LegalMonetaryTotal': {
        'cbc:PayableAmount': { _: data.total.toFixed(2), $: { currencyID: data.tipoMoneda } },
      },
    },
  };
}

/**
 * Genera el XML para facturas.
 */
export function generateInvoiceXML(data: any): string {
  const builder = new Builder({
    headless: false, // Incluir la cabecera XML // IMPORTANTE
    xmldec: { version: '1.0', encoding: 'UTF-8' }, // Especificar versión y codificación
  });
  const baseXML = generateBaseXML(data, 'Invoice');

  // Agregar líneas de factura
  baseXML.Invoice['cac:InvoiceLine'] = data.items.map((item: any, index: number) => ({
    'cbc:ID': index + 1,
    'cbc:InvoicedQuantity': { _: item.cantidad, $: { unitCode: 'NIU' } },
    'cbc:LineExtensionAmount': { _: item.total.toFixed(2), $: { currencyID: data.tipoMoneda } },
    'cac:Item': {
      'cbc:Description': item.descripcion,
    },
    'cac:Price': {
      'cbc:PriceAmount': { _: item.precioUnitario.toFixed(2), $: { currencyID: data.tipoMoneda } },
    },
    'cac:TaxTotal': {
      'cbc:TaxAmount': { _: item.igv.toFixed(2), $: { currencyID: data.tipoMoneda } },
      'cac:TaxSubtotal': {
        'cbc:TaxableAmount': { _: item.subTotal.toFixed(2), $: { currencyID: data.tipoMoneda } },
        'cbc:TaxAmount': { _: item.igv.toFixed(2), $: { currencyID: data.tipoMoneda } },
        'cac:TaxCategory': {
          'cac:TaxScheme': {
            'cbc:ID': '1000',
            'cbc:Name': 'IGV',
            'cbc:TaxTypeCode': 'VAT',
          },
        },
      },
    },
  }));

  // Al final, solo agregamos la firma sin encabezado extra
  // const finalXml = builder.buildObject(baseXML);
  return builder.buildObject(baseXML);
}

/**
 * Genera el XML para boletas.
 */
export function generateBoletaXML(data: any): string {
  const builder = new Builder({ headless: true });
  const baseXML = generateBaseXML(data, 'Invoice'); // Boletas también usan el nodo `Invoice`

  // Agregar líneas de boleta
  baseXML.Invoice['cac:InvoiceLine'] = data.items.map((item: any, index: number) => ({
    'cbc:ID': index + 1,
    'cbc:InvoicedQuantity': { _: item.cantidad, $: { unitCode: 'NIU' } },
    'cbc:LineExtensionAmount': { _: item.total.toFixed(2), $: { currencyID: data.tipoMoneda } },
    'cac:Item': {
      'cbc:Description': item.descripcion,
    },
    'cac:Price': {
      'cbc:PriceAmount': { _: item.precioUnitario.toFixed(2), $: { currencyID: data.tipoMoneda } },
    },
  }));

  return builder.buildObject(baseXML);
}

/**
 * Genera el XML para notas de crédito.
 */
export function generateCreditNoteXML(data: any): string {
  const builder = new Builder({ headless: true });
  const baseXML = generateBaseXML(data, 'CreditNote'); // Cambiar el nodo raíz a `CreditNote`

  // Agregar líneas de nota de crédito
  baseXML.CreditNote['cac:CreditNoteLine'] = data.items.map((item: any, index: number) => ({
    'cbc:ID': index + 1,
    'cbc:CreditedQuantity': { _: item.cantidad, $: { unitCode: 'NIU' } },
    'cbc:LineExtensionAmount': { _: item.total.toFixed(2), $: { currencyID: data.tipoMoneda } },
    'cac:Item': {
      'cbc:Description': item.descripcion,
    },
    'cac:Price': {
      'cbc:PriceAmount': { _: item.precioUnitario.toFixed(2), $: { currencyID: data.tipoMoneda } },
    },
  }));

  return builder.buildObject(baseXML);
}