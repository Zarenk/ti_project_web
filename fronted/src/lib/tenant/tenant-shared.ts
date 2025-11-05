const DEFAULT_RESERVED = ['www', 'app', 'dashboard'];

export const TENANT_COOKIE_NAME = 'tenant-store';

export type TenantCookiePayload = {
  slug: string;
  organizationId: number;
};

function getReservedSubdomains(): Set<string> {
  const custom = (process.env.NEXT_PUBLIC_RESERVED_SUBDOMAINS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_RESERVED, ...custom]);
}

function getRootDomain(): string | null {
  const raw = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '';
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/^https?:\/\//, '')
    .replace(/:\d+$/, '')
    .replace(/\/+$/, '');
}

export function resolveTenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) {
    return null;
  }

  const hostname = host.trim().toLowerCase().replace(/:\d+$/, '');
  if (!hostname) {
    return null;
  }

  const reserved = getReservedSubdomains();
  const rootDomain = getRootDomain();

  const tryCandidate = (candidate: string | null | undefined): string | null => {
    if (!candidate) {
      return null;
    }

    const value = candidate.trim().toLowerCase();
    if (!value || reserved.has(value)) {
      return null;
    }

    return value;
  };

  if (rootDomain && hostname === rootDomain) {
    return null;
  }

  if (rootDomain && hostname.endsWith(`.${rootDomain}`)) {
    const candidate = hostname.substring(0, hostname.length - rootDomain.length - 1);
    const slug = tryCandidate(candidate);
    if (slug) {
      return slug;
    }
  }

  if (hostname.endsWith('.localhost')) {
    const candidate = hostname.replace('.localhost', '');
    const slug = tryCandidate(candidate);
    if (slug) {
      return slug;
    }
  }

  if (hostname.endsWith('.lvh.me')) {
    const candidate = hostname.replace('.lvh.me', '');
    const slug = tryCandidate(candidate);
    if (slug) {
      return slug;
    }
  }

  const segments = hostname.split('.');
  if (segments.length > 2) {
    const slug = tryCandidate(segments[0]);
    if (slug) {
      return slug;
    }
  }

  return null;
}

export function parseTenantCookie(value: string | undefined | null): TenantCookiePayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as TenantCookiePayload;
    if (!parsed || typeof parsed.slug !== 'string') {
      return null;
    }

    const orgId = Number(parsed.organizationId);
    if (!Number.isFinite(orgId) || orgId <= 0) {
      return null;
    }

    return {
      slug: parsed.slug,
      organizationId: orgId,
    };
  } catch {
    return null;
  }
}

export function serializeTenantCookie(payload: TenantCookiePayload): string {
  return JSON.stringify({
    slug: payload.slug,
    organizationId: payload.organizationId,
  });
}
