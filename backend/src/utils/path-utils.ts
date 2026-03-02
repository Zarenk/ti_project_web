import * as path from 'path';
import { mkdirSync } from 'fs';

export function resolveBackendPath(...segments: string[]): string {
  let root = path.resolve(__dirname, '..', '..');
  while (['src', 'dist'].includes(path.basename(root))) {
    root = path.resolve(root, '..');
  }
  return path.join(root, ...segments);
}

/**
 * Resolve a persistent storage path.
 * On Railway with a Volume mounted, uses RAILWAY_VOLUME_MOUNT_PATH.
 * Locally (or without the env var) falls back to the backend root.
 */
export function resolveStoragePath(...segments: string[]): string {
  const root = process.env.RAILWAY_VOLUME_MOUNT_PATH || resolveBackendPath();
  return path.join(root, ...segments);
}

/** All subdirectories that must exist for uploads and storage. */
const STORAGE_SUBDIRS = [
  'uploads/products',
  'uploads/brands',
  'uploads/clients',
  'uploads/ads',
  'uploads/catalog',
  'uploads/invoices',
  'uploads/guides',
  'uploads/order-proofs',
  'uploads/legal-documents',
  'uploads/jurisprudence',
  'uploads/sunat/pdf/tmp',
  'uploads/sunat/tmp',
  'uploads/company-logos/tmp',
  'uploads/entries-drafts/invoices',
  'uploads/entries-drafts/guides',
  'comprobantes/pdf',
];

/**
 * Ensure all storage subdirectories exist at startup.
 * Called once from main.ts bootstrap.
 */
export function ensureStorageDirs(): void {
  for (const sub of STORAGE_SUBDIRS) {
    const dir = resolveStoragePath(sub);
    mkdirSync(dir, { recursive: true });
  }
  console.log(
    `[storage] dirs ensured under ${process.env.RAILWAY_VOLUME_MOUNT_PATH || 'backend root'}`,
  );
}
