import { create } from 'xmlbuilder2';

/**
 * Genera el XML base para documentos UBL 2.1.
 */

function generateBaseXML(data: any, documentType: string) {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele(documentType, {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'xmlns:cac':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'xmlns:ext':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
      'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation':
        'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd',
      Id: 'Invoice',
    })
    .ele('ext:UBLExtensions')
    .ele('ext:UBLExtension')
    .ele('ext:ExtensionContent')
    .ele('<__raw><!-- Firma digital no disponible --></__raw>')
    .up()
    .up()
    .up()
    .ele('cbc:UBLVersionID')
    .txt('2.1')
    .up()
    .ele('cbc:CustomizationID')
    .txt('2.0')
    .up()
    .ele('cbc:ID')
    .txt(`${data.serie}-${data.correlativo}`)
    .up()
    .ele('cbc:InvoiceTypeCode')
    .txt(
      documentType === 'Invoice'
        ? '01'
        : documentType === 'CreditNote'
          ? '07'
          : '03',
    )
    .up()
    .ele('cbc:IssueDate')
    .txt(data.fechaEmision)
    .up()
    .ele('cbc:DocumentCurrencyCode')
    .txt(data.tipoMoneda)
    .up()
    .ele('cac:AccountingSupplierParty')
    .ele('cbc:CustomerAssignedAccountID')
    .txt(data.emisor.ruc)
    .up()
    .ele('cbc:AdditionalAccountID')
    .txt('6')
    .up()
    .ele('cac:Party')
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(data.emisor.razonSocial)
    .up()
    .up()
    .up()
    .up()
    .ele('cac:AccountingCustomerParty')
    .ele('cbc:CustomerAssignedAccountID')
    .txt(data.cliente.ruc)
    .up()
    .ele('cbc:AdditionalAccountID')
    .txt('6')
    .up()
    .ele('cac:Party')
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(data.cliente.razonSocial)
    .up()
    .up()
    .up()
    .up()
    .ele('cac:TaxTotal')
    .ele('cbc:TaxAmount', { currencyID: data.tipoMoneda })
    .txt('18.00')
    .up()
    .up()
    .ele('cac:LegalMonetaryTotal')
    .ele('cbc:PayableAmount', { currencyID: data.tipoMoneda })
    .txt(Number(data.total || 0).toFixed(2))
    .up()
    .up();

  return doc;
}

/**
 * Genera el XML para facturas usando xmlbuilder2.
 */
export function generateInvoiceXML(data: any): string {
  const doc = generateBaseXML(data, 'Invoice');

  for (const [index, item] of data.items.entries()) {
    doc
      .ele('cac:InvoiceLine')
      .ele('cbc:ID')
      .txt(String(index + 1))
      .up()
      .ele('cbc:InvoicedQuantity', { unitCode: 'NIU' })
      .txt(String(item.cantidad))
      .up()
      .ele('cbc:LineExtensionAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.total || 0).toFixed(2))
      .up()
      .ele('cac:Item')
      .ele('cbc:Description')
      .txt(item.descripcion)
      .up()
      .up()
      .ele('cac:Price')
      .ele('cbc:PriceAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.precioUnitario || 0).toFixed(2))
      .up()
      .up()
      .ele('cac:TaxTotal')
      .ele('cbc:TaxAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.igv || 0).toFixed(2))
      .up()
      .ele('cac:TaxSubtotal')
      .ele('cbc:TaxableAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.subTotal || 0).toFixed(2))
      .up()
      .ele('cbc:TaxAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.igv || 0).toFixed(2))
      .up()
      .ele('cac:TaxCategory')
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
      .up();
  }

  return doc.end({ prettyPrint: false });
}

/**
 * Genera el XML para boletas.
 */
export function generateBoletaXML(data: any): string {
  const tipoDocumentoCliente =
    data.cliente?.tipoDocumento === 'CE'
      ? '4'
      : data.cliente?.tipoDocumento === 'PAS'
        ? '7'
        : '1'; // por defecto, DNI
  const numeroDocumentoCliente = data.cliente?.dni || '00000000';
  const razonSocialCliente = data.cliente?.nombre || 'CLIENTE GENERICO';

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Invoice', {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'xmlns:cac':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'xmlns:ext':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
      'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation':
        'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd',
      Id: 'Invoice',
    })
    .ele('ext:UBLExtensions')
    .ele('ext:UBLExtension')
    .ele('ext:ExtensionContent')
    .ele('<__raw><!-- Firma digital no disponible --></__raw>')
    .up()
    .up()
    .up()
    .ele('cbc:UBLVersionID')
    .txt('2.1')
    .up()
    .ele('cbc:CustomizationID')
    .txt('2.0')
    .up()
    .ele('cbc:ID')
    .txt(`${data.serie}-${data.correlativo}`)
    .up()
    .ele('cbc:InvoiceTypeCode')
    .txt('03')
    .up()
    .ele('cbc:IssueDate')
    .txt(data.fechaEmision)
    .up()
    .ele('cbc:DocumentCurrencyCode')
    .txt(data.tipoMoneda)
    .up()
    .ele('cac:AccountingSupplierParty')
    .ele('cbc:CustomerAssignedAccountID')
    .txt(data.emisor.ruc)
    .up()
    .ele('cbc:AdditionalAccountID')
    .txt('6')
    .up()
    .ele('cac:Party')
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(data.emisor.razonSocial)
    .up()
    .up()
    .up()
    .up()
    .ele('cac:AccountingCustomerParty')
    .ele('cbc:CustomerAssignedAccountID')
    .txt(String(numeroDocumentoCliente))
    .up()
    .ele('cbc:AdditionalAccountID')
    .txt(tipoDocumentoCliente)
    .up()
    .ele('cac:Party')
    .ele('cac:PartyName')
    .ele('cbc:Name')
    .txt(razonSocialCliente)
    .up()
    .up()
    .up()
    .up()
    .ele('cac:TaxTotal')
    .ele('cbc:TaxAmount', { currencyID: data.tipoMoneda })
    .txt('18.00')
    .up()
    .up()
    .ele('cac:LegalMonetaryTotal')
    .ele('cbc:PayableAmount', { currencyID: data.tipoMoneda })
    .txt(Number(data.total || 0).toFixed(2))
    .up()
    .up();

  for (const [index, item] of data.items.entries()) {
    doc
      .ele('cac:InvoiceLine')
      .ele('cbc:ID')
      .txt(String(index + 1))
      .up()
      .ele('cbc:InvoicedQuantity', { unitCode: 'NIU' })
      .txt(String(item.cantidad))
      .up()
      .ele('cbc:LineExtensionAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.total || 0).toFixed(2))
      .up()
      .ele('cac:Item')
      .ele('cbc:Description')
      .txt(item.descripcion)
      .up()
      .up()
      .ele('cac:Price')
      .ele('cbc:PriceAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.precioUnitario || 0).toFixed(2))
      .up()
      .up()
      .ele('cac:TaxTotal')
      .ele('cbc:TaxAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.igv || 0).toFixed(2))
      .up()
      .ele('cac:TaxSubtotal')
      .ele('cbc:TaxableAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.subTotal || 0).toFixed(2))
      .up()
      .ele('cbc:TaxAmount', { currencyID: data.tipoMoneda })
      .txt(Number(item.igv || 0).toFixed(2))
      .up()
      .ele('cac:TaxCategory')
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
      .up();
  }

  return doc.end({ prettyPrint: false });
}
/**
 * Genera el XML para notas de crédito.
 */

/*
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
*/
