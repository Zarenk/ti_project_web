export type FormattedGlosa = {
  description?: string;
  series: string[];
  documentType?: string;
};

export type FormatDisplayGlosaParams = {
  baseDescription?: string;
  provider?: string;
  voucher?: string;
  serie?: string;
  tipoComprobante?: string | null;
};

const escapeRegExp = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const normalizeDocumentType = (docType?: string | null): string | undefined => {
  if (!docType) return undefined;
  const normalized = docType.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === "INVOICE" || normalized === "FACTURA" || normalized === "01") {
    return "FACTURA";
  }
  if (normalized === "BOLETA" || normalized === "03") {
    return "BOLETA";
  }
  if (normalized === "TICKET" || normalized === "RECIBO") {
    return normalized;
  }
  if (normalized.includes("FACT")) {
    return "FACTURA";
  }
  if (normalized.includes("BOL")) {
    return "BOLETA";
  }
  if (normalized.includes("SIN COMPROBANTE")) {
    return undefined;
  }
  return normalized;
};

const inferDocumentTypeFromSerie = (serie?: string): string | undefined => {
  if (!serie) return undefined;
  const prefix = serie.trim().toUpperCase();
  if (!prefix) return undefined;
  if (prefix.startsWith("F")) return "FACTURA";
  if (prefix.startsWith("B")) return "BOLETA";
  return undefined;
};

const dedupeVoucherValue = (value: string) => {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const repeatedWithDash = trimmed.match(/^(.+?)(?:\s*[-–]\s*\1)+$/);
  if (repeatedWithDash) {
    return repeatedWithDash[1];
  }

  const repeatedWithSpaces = trimmed.match(/^(.+?)(?:\s+\1)+$/);
  if (repeatedWithSpaces) {
    return repeatedWithSpaces[1];
  }

  return trimmed;
};

const dedupeVoucherOccurrences = (text: string, voucher: string) => {
  if (!text) return text;
  const escaped = escapeRegExp(voucher);
  const hyphenPattern = new RegExp(`(${escaped})(?:\s*[\-–]\s*${escaped})+`, "gi");
  let result = text.replace(hyphenPattern, voucher);
  const repeatedPattern = new RegExp(`(${escaped})(?:\s+${escaped})+`, "gi");
  result = result.replace(repeatedPattern, voucher);
  result = result.replace(/\s{2,}/g, " ");
  result = result.replace(/-\s+-/g, "-");
  result = result.replace(/\s+–\s+/g, " – ");
  return result.trim();
};

const ensureDocTypeInBase = (text: string, voucher: string, docType: string) => {
  if (!text) return text;
  const escapedVoucher = escapeRegExp(voucher);
  const uppercaseDocType = docType.toUpperCase();
  const docTypeWithVoucher = new RegExp(`${uppercaseDocType}\\s+${escapedVoucher}`, "i");
  if (docTypeWithVoucher.test(text)) {
    return text;
  }
  const voucherRegex = new RegExp(escapedVoucher, "i");
  if (voucherRegex.test(text)) {
    return text.replace(voucherRegex, `${uppercaseDocType} ${voucher}`);
  }
  return `${text} ${uppercaseDocType} ${voucher}`.trim();
};

const extractSeriesFromDescription = (description?: string) => {
  if (!description) {
    return { sanitized: undefined as string | undefined, series: [] as string[] };
  }
  const [leftPart, ...restParts] = description.split(" – ");
  let series: string[] = [];
  let sanitizedLeft = leftPart;
  if (leftPart) {
    const matches = [...leftPart.matchAll(/\(([^()]+)\)/g)]
      .map((match) => match[1].trim())
      .filter((value) => value && !/sin comprobante/i.test(value));
    series = matches
      .flatMap((value) => value.split(/[,;]/))
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (matches.length > 0) {
      sanitizedLeft = leftPart.replace(/\s*\([^()]*\)/g, "").replace(/\s{2,}/g, " ").trim();
    }
  }
  const sanitized = [sanitizedLeft, ...restParts].filter(Boolean).join(" – ").trim();
  return { sanitized: sanitized || undefined, series };
};

export function formatDisplayGlosa({
  baseDescription,
  provider,
  voucher,
  serie,
  tipoComprobante,
}: FormatDisplayGlosaParams): FormattedGlosa {
  const normalizedVoucher = voucher ? dedupeVoucherValue(voucher) : undefined;
  const normalizedDocType =
    normalizeDocumentType(tipoComprobante) ?? inferDocumentTypeFromSerie(serie);

  const { sanitized: sanitizedBase, series } = extractSeriesFromDescription(baseDescription);

  let description = sanitizedBase ?? "";

  if (normalizedVoucher) {
    description = dedupeVoucherOccurrences(description, normalizedVoucher);
  }

  if (description && normalizedVoucher && normalizedDocType) {
    description = ensureDocTypeInBase(description, normalizedVoucher, normalizedDocType);
  }

  const extras: string[] = [];
  if (provider) {
    const providerRegex = new RegExp(escapeRegExp(provider.trim()), "i");
    if (!providerRegex.test(description)) {
      extras.push(provider.trim());
    }
  }

  if (normalizedDocType) {
    const docTypeRegex = new RegExp(normalizedDocType, "i");
    if (!docTypeRegex.test(description)) {
      extras.push(normalizedDocType);
    }
  }

  if (normalizedVoucher) {
    const voucherRegex = new RegExp(escapeRegExp(normalizedVoucher), "i");
    if (!voucherRegex.test(description)) {
      extras.push(normalizedVoucher);
    }
  }

  let finalDescription = description.trim();
  if (finalDescription && extras.length > 0) {
    finalDescription = `${finalDescription} (${extras.join(" · ")})`;
  } else if (!finalDescription && extras.length > 0) {
    finalDescription = extras.join(" · ");
  }

  return {
    description: finalDescription || undefined,
    series,
    documentType: normalizedDocType,
  };
}