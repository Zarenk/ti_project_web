import * as fs from 'fs';
import * as soap from 'soap';
import * as path from 'path';

interface SunatResponse {
  applicationResponse: string;
}

type SendDespatchOptions = {
  endpoint?: string;
  username?: string;
  password?: string;
  wsdlPath?: string;
};

const DEFAULT_WSDL_CANDIDATES = [
  path.join(process.cwd(), 'dist', 'src', 'guide', 'wsdl', 'guia.wsdl'),
  path.join(process.cwd(), 'src', 'guide', 'wsdl', 'guia.wsdl'),
];

function resolveWsdlPath(customPath?: string) {
  if (customPath && fs.existsSync(customPath)) return customPath;
  for (const candidate of DEFAULT_WSDL_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return customPath ?? DEFAULT_WSDL_CANDIDATES[0];
}

export async function sendDespatchToSunat(
  zipPath: string,
  zipName: string,
  options: SendDespatchOptions = {},
) {
  const wsdlPath = resolveWsdlPath(options.wsdlPath);
  const endpoint =
    options.endpoint ??
    process.env.SUNAT_SOAP_ENDPOINT ??
    'https://e-beta.sunat.gob.pe/ol-ti-itemision-guia-gem-beta/billService';

  if (!fs.existsSync(wsdlPath)) {
    throw new Error(`El archivo WSDL no se encontrÃ³ en la ruta: ${wsdlPath}`);
  }

  const zipBuffer = fs.readFileSync(zipPath);
  const zipBase64 = zipBuffer.toString('base64');

  const client = await soap.createClientAsync(wsdlPath, { endpoint });

  const usuarioSol = options.username ?? process.env.SUNAT_USERNAME ?? '';
  const passwordSol = options.password ?? process.env.SUNAT_PASSWORD ?? '';
  if (!usuarioSol || !passwordSol) {
    throw new Error('Credenciales SOL no configuradas para SOAP.');
  }
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
