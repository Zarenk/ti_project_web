export function getAllowedOrigins(): string[] {
  return (
    process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || [
      'http://localhost:3000',
    ]
  );
}

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return true;
  if (/^https?:\/\/[^.]+\.lvh\.me(?::\d+)?$/i.test(origin)) return true;
  return false;
}
