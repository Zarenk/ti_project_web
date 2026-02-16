const heuristics = [
  { key: 'serie', pattern: /serie\s*[:\-]?\s*([A-Z0-9-]+)/i },
  {
    key: 'nroCorrelativo',
    pattern: /(?:correlativo|nro\.?|nº)\s*[:\-]?\s*([0-9-]+)/i,
  },
  { key: 'total', pattern: /total\s*[:\-]?\s*(?:s\/|s\$|\$)?\s*([0-9.,]+)/i },
  { key: 'rucEmisor', pattern: /ruc\s*[:\-]?\s*([0-9*]+)/i },
];

export function buildTemplateSuggestion(text: string) {
  const normalized = (text ?? '').replace(/\u00a0/g, ' ');
  const regexRules: Record<string, string> = {};
  const fieldMappings: Record<string, { pattern: string }> = {};

  heuristics.forEach(({ key, pattern }) => {
    const match = normalized.match(pattern);
    if (match) {
      const patternSource = pattern.source;
      regexRules[key] = patternSource;
      fieldMappings[key] = { pattern: patternSource };
    }
  });

  if (!regexRules.total) {
    const fallback = normalized.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/);
    if (fallback) {
      const escaped = fallback[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regexRules.total = escaped;
      fieldMappings.total = { pattern: escaped };
    }
  }

  return {
    regexRules,
    fieldMappings,
  };
}
