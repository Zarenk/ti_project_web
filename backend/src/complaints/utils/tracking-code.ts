import { randomBytes } from 'crypto';

/**
 * Generates a tracking code for public complaint lookup.
 * Format: LR-{8 alphanumeric chars} e.g. LR-A1B2C3D4
 */
export function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous: 0/O, 1/I
  const bytes = randomBytes(8);
  let code = '';

  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }

  return `LR-${code}`;
}
