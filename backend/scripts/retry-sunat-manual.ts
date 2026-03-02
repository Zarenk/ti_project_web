/**
 * Manual SUNAT retry script — standalone, no NestJS required.
 * Usage: npx ts-node scripts/retry-sunat-manual.ts [saleId]
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { generateBoletaXML, generateInvoiceXML, generateCreditNoteXML } from '../src/sunat/utils/xml-generator';
import { firmarDocumentoUBL } from '../src/sunat/utils/signer';
import { generateZip } from '../src/sunat/utils/zip-generator';
import { sendToSunat } from '../src/sunat/utils/sunat-client';
import { resolveBackendPath } from '../src/utils/path-utils';
import * as fs from 'fs';
import * as path from 'path';

const SUNAT_ENDPOINTS = {
  BETA: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
  PROD: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
};

async function main() {
  const saleId = parseInt(process.argv[2] || '3447', 10);
  console.log(`\n=== Reintento manual SUNAT para venta #${saleId} ===\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 1. Fetch sale with all related data
    const saleRes = await pool.query(`
      SELECT s.id, s.total, s."companyId", s."organizationId", s."igvTotal",
             s."description",
             c.name as "clientName", c."typeNumber" as "clientDoc",
             c.type as "clientDocType"
      FROM "Sales" s
      LEFT JOIN "Client" c ON c.id = s."clientId"
      WHERE s.id = $1
    `, [saleId]);

    if (saleRes.rows.length === 0) {
      console.error(`Venta #${saleId} no encontrada.`);
      return;
    }
    const sale = saleRes.rows[0];
    console.log(`Venta: #${sale.id}, Total: S/${sale.total}, Company: ${sale.companyId}`);

    // 2. Fetch sale details (items)
    const detailsRes = await pool.query(`
      SELECT sd.quantity, sd.price, sd."productId",
             p.name as "productName"
      FROM "SalesDetail" sd
      LEFT JOIN "EntryDetail" ed ON ed.id = sd."entryDetailId"
      LEFT JOIN "Product" p ON p.id = COALESCE(sd."productId", ed."productId")
      WHERE sd."salesId" = $1
    `, [saleId]);
    console.log(`Items: ${detailsRes.rows.length}`);

    // 3. Fetch invoice
    const invoiceRes = await pool.query(`
      SELECT i.id, i.serie, i."nroCorrelativo", i."tipoComprobante",
             i."tipoMoneda", i.total as "invoiceTotal"
      FROM "InvoiceSales" i
      WHERE i."salesId" = $1
      LIMIT 1
    `, [saleId]);

    if (invoiceRes.rows.length === 0) {
      console.error('No tiene comprobante asociado.');
      return;
    }
    const invoice = invoiceRes.rows[0];
    console.log(`Comprobante: ${invoice.tipoComprobante} ${invoice.serie}-${invoice.nroCorrelativo}`);

    // 4. Fetch company SUNAT config
    const companyRes = await pool.query(`
      SELECT id, name, "sunatRuc", "taxId", "sunatBusinessName", "sunatAddress",
             "sunatEnvironment", "sunatSolUserBeta", "sunatSolPasswordBeta",
             "sunatCertPathBeta", "sunatKeyPathBeta",
             "sunatSolUserProd", "sunatSolPasswordProd",
             "sunatCertPathProd", "sunatKeyPathProd"
      FROM "Company" WHERE id = $1
    `, [sale.companyId]);
    const company = companyRes.rows[0];
    const environment = company.sunatEnvironment === 'PROD' ? 'PROD' : 'BETA';
    const isProd = environment === 'PROD';

    const ruc = company.sunatRuc || company.taxId;
    const username = isProd ? company.sunatSolUserProd : company.sunatSolUserBeta;
    const password = isProd ? company.sunatSolPasswordProd : company.sunatSolPasswordBeta;
    const certPath = resolveBackendPath(isProd ? company.sunatCertPathProd : company.sunatCertPathBeta);
    const keyPath = resolveBackendPath(isProd ? company.sunatKeyPathProd : company.sunatKeyPathBeta);

    console.log(`RUC: ${ruc}, Ambiente: ${environment}`);
    console.log(`Cert: ${certPath} (exists: ${fs.existsSync(certPath)})`);
    console.log(`Key: ${keyPath} (exists: ${fs.existsSync(keyPath)})`);

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.error('Certificado o clave privada no encontrados.');
      return;
    }

    // 5. Build documentData
    const isFactura = invoice.tipoComprobante?.toUpperCase() === 'FACTURA';
    const documentType = isFactura ? 'invoice' : 'boleta';
    const tipoComprobante = isFactura ? '01' : '03';

    const total = Number(sale.total) || 0;
    const igv = Number(sale.igvTotal) || +(total - total / 1.18).toFixed(2);
    const subtotal = +(total - igv).toFixed(2);

    const documentData = {
      serie: invoice.serie,
      correlativo: invoice.nroCorrelativo,
      fechaEmision: new Date().toISOString(),
      tipoMoneda: invoice.tipoMoneda || 'PEN',
      tipoOperacion: '0101',
      emisor: {
        ruc,
        razonSocial: company.sunatBusinessName || company.name || '',
        direccion: company.sunatAddress || '',
      },
      cliente: {
        tipoDocumento: sale.clientDocType || '1',
        numeroDocumento: sale.clientDoc || '00000000',
        razonSocial: sale.clientName || 'CLIENTE',
      },
      items: detailsRes.rows.map((d: any) => ({
        descripcion: d.productName || 'Producto',
        cantidad: Number(d.quantity) || 1,
        precioUnitario: Number(d.price) || 0,
        total: (Number(d.quantity) || 1) * (Number(d.price) || 0),
        unitCode: 'NIU',
      })),
      subtotal,
      igv,
      total,
    };

    console.log('\n--- Document Data ---');
    console.log(JSON.stringify(documentData, null, 2));

    // 6. Generate XML
    console.log('\nGenerando XML...');
    let xml: string;
    if (documentType === 'invoice') {
      xml = generateInvoiceXML(documentData);
    } else {
      xml = generateBoletaXML(documentData);
    }

    // Quick sanity checks
    const hasProfileID = xml.includes('Tipo de Operacion');
    const hasAddressTypeCode = xml.includes('AddressTypeCode');
    console.log(`  ProfileID attrs: ${hasProfileID ? 'OK' : 'MISSING!'}`);
    console.log(`  AddressTypeCode: ${hasAddressTypeCode ? 'OK' : 'MISSING!'}`);

    if (!hasProfileID || !hasAddressTypeCode) {
      console.error('\nXML no tiene los fixes aplicados. Abortando.');
      return;
    }

    // 7. Sign XML
    console.log('Firmando XML...');
    const signedXml = await firmarDocumentoUBL(xml, keyPath, certPath);
    console.log(`  Firmado OK (${signedXml.length} chars)`);

    // 8. Generate ZIP
    const zipFileName = `${ruc}-${tipoComprobante}-${invoice.serie}-${invoice.nroCorrelativo}`;
    console.log(`Generando ZIP: ${zipFileName}.zip`);
    const zipFilePath = generateZip(zipFileName, signedXml, documentType);
    console.log(`  ZIP: ${zipFilePath}`);

    // Save XML too
    const xmlFolder = resolveBackendPath('sunat', 'xml', documentType);
    if (!fs.existsSync(xmlFolder)) {
      fs.mkdirSync(xmlFolder, { recursive: true });
    }
    const xmlFilePath = path.join(xmlFolder, `${zipFileName}.xml`);
    fs.writeFileSync(xmlFilePath, signedXml, 'utf-8');

    // 9. Create new transmission record
    const txRes = await pool.query(`
      INSERT INTO "SunatTransmission"
        ("companyId", "organizationId", "saleId", environment, "documentType",
         serie, correlativo, status, payload, "zipFilePath", "xmlFilePath",
         "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'SENDING', $8, $9, $10, NOW(), NOW())
      RETURNING id
    `, [
      sale.companyId, sale.organizationId, saleId, environment,
      documentType, invoice.serie, invoice.nroCorrelativo,
      JSON.stringify(documentData), zipFilePath, xmlFilePath,
    ]);
    const transmissionId = txRes.rows[0].id;
    console.log(`\nTransmission #${transmissionId} creada (SENDING)`);

    // 10. SEND TO SUNAT
    const sunatUrl = isProd ? SUNAT_ENDPOINTS.PROD : SUNAT_ENDPOINTS.BETA;
    console.log(`\nEnviando a SUNAT (${environment}): ${sunatUrl}`);
    console.log('Esperando respuesta...\n');

    const response = await sendToSunat(zipFilePath, zipFileName, sunatUrl, username, password);

    // 11. Process response
    const cdrCode = response?.cdrCode ?? null;
    const cdrDescription = response?.cdrDescription ?? null;
    const soapFault = response?.soapFault ?? null;

    let status = 'SENT';
    let errorMessage: string | null = null;

    if (cdrCode) {
      if (cdrCode === '0') status = 'ACCEPTED';
      else if (cdrCode === '98') status = 'PENDING';
      else if (cdrCode === '99') status = 'REJECTED';
      else status = 'OBSERVED';
    } else if (soapFault) {
      status = 'FAILED';
      errorMessage = soapFault;
    } else {
      errorMessage = 'Respuesta sin CDR.';
    }

    // Save CDR if present
    let cdrFilePath: string | null = null;
    if (response?.cdrXml) {
      const cdrFolder = resolveBackendPath('sunat', 'cdr', documentType);
      if (!fs.existsSync(cdrFolder)) {
        fs.mkdirSync(cdrFolder, { recursive: true });
      }
      cdrFilePath = path.join(cdrFolder, `${zipFileName}-cdr.xml`);
      fs.writeFileSync(cdrFilePath, response.cdrXml, 'utf-8');
    }

    // 12. Update transmission record
    await pool.query(`
      UPDATE "SunatTransmission"
      SET status = $1, "cdrCode" = $2, "cdrDescription" = $3,
          "errorMessage" = $4, "cdrFilePath" = $5, "updatedAt" = NOW()
      WHERE id = $6
    `, [status, cdrCode, cdrDescription, errorMessage, cdrFilePath, transmissionId]);

    // Print result
    console.log('═══════════════════════════════════════');
    console.log(`  RESULTADO: ${status}`);
    console.log(`  CDR Code: ${cdrCode ?? 'N/A'}`);
    console.log(`  CDR Desc: ${cdrDescription ?? 'N/A'}`);
    if (soapFault) console.log(`  SOAP Fault: ${soapFault}`);
    if (errorMessage) console.log(`  Error: ${errorMessage}`);
    console.log('═══════════════════════════════════════\n');

  } catch (err: any) {
    console.error('\n*** ERROR ***');
    console.error(err.message);
    if (err.response?.data) {
      console.error('Response data:', typeof err.response.data === 'string'
        ? err.response.data.substring(0, 500)
        : err.response.data);
    }
  } finally {
    await pool.end();
  }
}

main();
