import * as fs from 'fs';
import * as soap from 'soap';
import * as path from 'path';

interface SunatResponse {
  applicationResponse: string;
}

export async function sendDespatchToSunat(zipPath: string, zipName: string) {
  const wsdlPath = path.join(process.cwd(), 'src', 'guide', 'wsdl', 'guia.wsdl');
  const endpoint = 'https://e-beta.sunat.gob.pe/ol-ti-itemision-guia-gem-beta/billService';

  if (!fs.existsSync(wsdlPath)) {
    throw new Error(`El archivo WSDL no se encontró en la ruta: ${wsdlPath}`);
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const zipBase64 = zipBuffer.toString('base64');

  const client = await soap.createClientAsync(wsdlPath, { endpoint });

  const usuarioSol = `20123456789MODDATOS`;
  const passwordSol = 'moddatos';
  client.setSecurity(new soap.BasicAuthSecurity(usuarioSol, passwordSol));

  const args = {
    fileName: zipName,
    contentFile: zipBase64,
  };

  return new Promise<SunatResponse>((resolve, reject) => {
    client.sendBill(args, (err: any, result: SunatResponse, rawResponse) => {
      if (err) {
            console.error('Error completo:', err);
            return reject(err);
        }
        console.log('Respuesta completa:', rawResponse);
        resolve(result);
    });
  });
}

