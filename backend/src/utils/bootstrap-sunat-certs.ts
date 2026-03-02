import * as fs from 'fs';
import * as path from 'path';

/**
 * Writes SUNAT certificate and private key from environment variables to disk.
 * Designed for ephemeral filesystems like Railway where uploaded files are lost
 * on each deploy. Set SUNAT_CERT_B64 and SUNAT_KEY_B64 in Railway env vars
 * with the base64-encoded contents of cert.pem and key.pem respectively.
 *
 * Files are written to: <backend-root>/sunat/prod/cert.pem and key.pem
 */
export function bootstrapSunatCerts(): void {
  const certB64 = process.env.SUNAT_CERT_B64;
  const keyB64 = process.env.SUNAT_KEY_B64;

  if (!certB64 && !keyB64) return;

  const root = process.cwd();
  const targetDir = path.join(root, 'sunat', 'prod');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (certB64) {
    const certPath = path.join(targetDir, 'cert.pem');
    fs.writeFileSync(certPath, Buffer.from(certB64, 'base64'), 'utf8');
    console.log(`[SUNAT] Certificate written to ${certPath}`);
  }

  if (keyB64) {
    const keyPath = path.join(targetDir, 'key.pem');
    fs.writeFileSync(keyPath, Buffer.from(keyB64, 'base64'), 'utf8');
    console.log(`[SUNAT] Private key written to ${keyPath}`);
  }
}
