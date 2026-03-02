import { KmsService } from '../common/security/kms.service';

/**
 * Sensitive data policy for the GYM vertical.
 *
 * Fields that MUST be encrypted at rest:
 *   - medicalConditions   (health data — personal)
 *   - injuries            (health data — personal)
 *   - emergencyContactPhone (PII)
 *
 * Fields that are NOT encrypted (needed for queries/reports):
 *   - firstName, lastName, email, phone, dni
 *
 * Uses KmsService (AES-256-GCM envelope encryption) from
 * backend/src/common/security/kms.service.ts
 *
 * Env: KMS_MASTER_KEY must be set in production.
 */

const SENSITIVE_MEMBER_FIELDS = [
  'medicalConditions',
  'injuries',
  'emergencyContactPhone',
] as const;

export type SensitiveMemberField = (typeof SENSITIVE_MEMBER_FIELDS)[number];

let _kms: KmsService | null = null;

function getKms(): KmsService {
  if (!_kms) {
    _kms = new KmsService();
  }
  return _kms;
}

/**
 * Encrypts sensitive fields in a member record before persisting.
 * Non-sensitive fields and null/undefined values are left untouched.
 *
 * @param data - Partial member record with plain-text values
 * @returns    - Same record with sensitive fields encrypted
 */
export function encryptSensitiveFields<
  T extends Partial<Record<SensitiveMemberField, string | null>>,
>(data: T): T {
  const kms = getKms();
  const result = { ...data };

  for (const field of SENSITIVE_MEMBER_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0) {
      (result as Record<string, unknown>)[field] = kms.encrypt(value);
    }
  }

  return result;
}

/**
 * Decrypts sensitive fields in a member record after reading from DB.
 * Non-sensitive fields and null/undefined values are left untouched.
 *
 * @param data - Partial member record with encrypted values
 * @returns    - Same record with sensitive fields decrypted
 */
export function decryptSensitiveFields<
  T extends Partial<Record<SensitiveMemberField, string | null>>,
>(data: T): T {
  const kms = getKms();
  const result = { ...data };

  for (const field of SENSITIVE_MEMBER_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        (result as Record<string, unknown>)[field] = kms.decrypt(value);
      } catch {
        // Value might not be encrypted (legacy data), leave as-is
      }
    }
  }

  return result;
}

/**
 * Returns the list of field names that are considered sensitive.
 * Useful for building Prisma select/omit queries.
 */
export function getSensitiveFieldNames(): readonly SensitiveMemberField[] {
  return SENSITIVE_MEMBER_FIELDS;
}
