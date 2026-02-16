import { readFileSync } from 'node:fs';

export type OrgArgParseResult = {
  orgIds: number[];
  rest: string[];
};

function parseNumberList(raw?: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(/[\,\s]+/)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function readIdsFromFile(path?: string): number[] {
  if (!path) return [];
  try {
    const contents = readFileSync(path, 'utf8');
    return parseNumberList(contents);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo leer el archivo de organizaciones ${path}: ${details}`);
  }
}

export function parseOrgArgs(argv: string[]): OrgArgParseResult {
  const orgIds: number[] = [];
  const rest: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--org' || arg === '--orgId') {
      const value = argv[index + 1];
      index += 1;
      orgIds.push(...parseNumberList(value));
      continue;
    }

    if (arg.startsWith('--org=') || arg.startsWith('--orgId=')) {
      const [, value] = arg.split('=');
      orgIds.push(...parseNumberList(value));
      continue;
    }

    if (arg === '--orgs' || arg === '--orgIds') {
      const value = argv[index + 1];
      index += 1;
      orgIds.push(...parseNumberList(value));
      continue;
    }

    if (arg.startsWith('--orgs=') || arg.startsWith('--orgIds=')) {
      const [, value] = arg.split('=');
      orgIds.push(...parseNumberList(value));
      continue;
    }

    if (arg === '--org-file' || arg === '--orgs-file') {
      const filePath = argv[index + 1];
      index += 1;
      orgIds.push(...readIdsFromFile(filePath));
      continue;
    }

    if (arg.startsWith('--org-file=') || arg.startsWith('--orgs-file=')) {
      const [, filePath] = arg.split('=');
      orgIds.push(...readIdsFromFile(filePath));
      continue;
    }

    rest.push(arg);
  }

  const unique = Array.from(new Set(orgIds)).sort((a, b) => a - b);
  return { orgIds: unique, rest };
}

export function ensureOrgIds(orgIds: number[]): void {
  if (!orgIds.length) {
    throw new Error(
      'Debes especificar al menos una organizacion mediante --org, --orgs o --orgs-file.',
    );
  }
}
