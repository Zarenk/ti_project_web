import { promises as dns } from 'dns';
import { URL } from 'url';
import * as net from 'net';

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return (
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      (ip.startsWith('172.') &&
        (() => {
          const second = parseInt(ip.split('.')[1], 10);
          return second >= 16 && second <= 31;
        })()) ||
      ip.startsWith('127.') ||
      ip.startsWith('169.254')
    );
  }
  if (net.isIPv6(ip)) {
    return (
      ip === '::1' ||
      ip.startsWith('fc') ||
      ip.startsWith('fd') ||
      ip.startsWith('fe80')
    );
  }
  return false;
}

/** Trusted government domains that are safe to call (skip DNS check). */
const TRUSTED_DOMAINS = [
  'sunat.gob.pe',
];

function isTrustedDomain(hostname: string): boolean {
  return TRUSTED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith(`.${d}`),
  );
}

/** Ensures the provided URL does not resolve to a private IP address. */
export async function assertSafeUrl(rawUrl: string): Promise<void> {
  const { hostname } = new URL(rawUrl);

  if (isTrustedDomain(hostname)) {
    return;
  }

  const records = await dns.lookup(hostname, { all: true });
  for (const record of records) {
    if (isPrivateAddress(record.address)) {
      throw new Error('SSRF protection: private IPs are not allowed');
    }
  }
}
