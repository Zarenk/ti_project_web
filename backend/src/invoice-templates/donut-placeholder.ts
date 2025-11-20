type DonutField = {
  value?: string;
  formatted_text?: string;
  label?: string;
  id?: string;
  name?: string;
};

interface SuggestionPayload {
  regexRules: Record<string, string>;
  fieldMappings: Record<string, { pattern: string; jsonPath?: string }>;
}

export function buildSuggestionFromDonutResponse(
  response: any,
): SuggestionPayload | null {
  const fields = response?.document?.fields;
  if (!fields || typeof fields !== 'object') {
    return null;
  }

  const regexRules: Record<string, string> = {};
  const fieldMappings: Record<string, { pattern: string; jsonPath?: string }> =
    {};

  for (const [key, field] of Object.entries(fields as Record<string, DonutField>)) {
    const value =
      field?.value ??
      field?.formatted_text ??
      field?.label ??
      (typeof field === 'string' ? field : '');
    const normalizedValue = String(value).trim();
    regexRules[key] = normalizedValue
      ? `.*${normalizedValue.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}.*`
      : '.*';
    fieldMappings[key] = {
      pattern: normalizedValue ? `.*${normalizedValue}.*` : '.*',
      jsonPath: field?.id ?? field?.name ?? key,
    };
  }

  return { regexRules, fieldMappings };
}
