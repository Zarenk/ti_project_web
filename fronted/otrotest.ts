import * as fs from 'fs';
import * as forge from 'node-forge';

const pkcs1Pem = fs.readFileSync('certificates/private_rsa.key', 'utf8');

// 1. Parsear PKCS#1
const privateKey = forge.pki.privateKeyFromPem(pkcs1Pem);

// 2. Convertir a ASN.1 (PKCS#8)
const pkcs8 = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(privateKey));
const pkcs8Pem = forge.pki.privateKeyInfoToPem(pkcs8);

// 3. Guardar resultado
fs.writeFileSync('certificates/private.key', pkcs8Pem);

console.log('✅ Clave convertida a PKCS#8 (formato correcto para xml-crypto)');