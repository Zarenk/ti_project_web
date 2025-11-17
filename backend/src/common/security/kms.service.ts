import * as crypto from 'crypto';

/**
 * Minimal envelope encryption adapter.
 * Uses an env-provided master key to encrypt a random data key which
 * subsequently encrypts the payload.
 */
export class KmsService {
  private readonly masterKey: Buffer;

  constructor(
    masterKey = process.env.KMS_MASTER_KEY || 'local-dev-master-key',
  ) {
    // Derive a 32 byte key from provided string
    this.masterKey = crypto.createHash('sha256').update(masterKey).digest();
  }

  encrypt(plainText: string): string {
    const dataKey = crypto.randomBytes(32);

    // Encrypt plaintext with data key
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
    const cipherText = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Encrypt data key with master key
    const keyIv = crypto.randomBytes(12);
    const keyCipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.masterKey,
      keyIv,
    );
    const encKey = Buffer.concat([
      keyCipher.update(dataKey),
      keyCipher.final(),
    ]);
    const keyTag = keyCipher.getAuthTag();

    const payload = {
      ek: encKey.toString('base64'),
      eiv: keyIv.toString('base64'),
      et: keyTag.toString('base64'),
      iv: iv.toString('base64'),
      tag: authTag.toString('base64'),
      c: cipherText.toString('base64'),
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  decrypt(payload: string): string {
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));

    const keyDecipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.masterKey,
      Buffer.from(decoded.eiv, 'base64'),
    );
    keyDecipher.setAuthTag(Buffer.from(decoded.et, 'base64'));
    const dataKey = Buffer.concat([
      keyDecipher.update(Buffer.from(decoded.ek, 'base64')),
      keyDecipher.final(),
    ]);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      dataKey,
      Buffer.from(decoded.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(decoded.tag, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(decoded.c, 'base64')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  }
}
