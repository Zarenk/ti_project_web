import * as path from 'path';

export function resolveBackendPath(...segments: string[]): string {
  let root = path.resolve(__dirname, '..', '..');
  while (['src', 'dist'].includes(path.basename(root))) {
    root = path.resolve(root, '..');
  }
  return path.join(root, ...segments);
}