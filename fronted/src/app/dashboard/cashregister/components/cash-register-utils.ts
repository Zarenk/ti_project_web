import { Transaction } from "../types/cash-register"

const isSaleTransaction = (description?: string | null) => {
  if (!description) {
    return false;
  }
  return description.toLowerCase().includes("venta realizada");
};

const stripPaymentMethodDetails = (value: string) => {
  if (!value) {
    return "";
  }

  const patterns = [
    /pago\s+v(?:i|\u00ED)a[^.,;|]*/gi,
    /pago\s+con[^.,;|]*/gi,
    /m(?:e|\u00E9)todos?\s+de\s+pago\s*:[^.|;]*/gi,
    /m(?:e|\u00E9)todo\s+de\s+pago\s*:[^.|;]*/gi,
  ];

  let sanitized = value;
  patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, " ");
  });

  sanitized = sanitized.replace(/[,;]+/g, " ");
  return sanitized.replace(/\s+/g, " ").trim();
};
const splitSaleDescription = (description: string | null | undefined) => {
  if (!description) {
    return {
      prefix: "",
      suffix: "",
      normalized: "",
    };
  }

  const lowerDescription = description.toLowerCase();
  const saleMarker = lowerDescription.indexOf("venta registrada:");

  if (saleMarker !== -1) {
    const prefix = description.slice(0, saleMarker).trim();
    const suffix = description.slice(saleMarker).trim();
    const sanitizedForKey = stripPaymentMethodDetails(prefix);

    return {
      prefix,
      suffix,
      normalized: (sanitizedForKey || prefix)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim(),
    };
  }

  const sanitizedForKey = stripPaymentMethodDetails(description);

  return {
    prefix: description.trim(),
    suffix: "",
    normalized: (sanitizedForKey || description)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim(),
  };
};

export const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

export const sanitizeClosureNotes = (value: string) => {
  if (!value) {
    return "";
  }

  const collapsed = value.replace(
    /(cierre de caja)(?:(?:\s|[|,.;:-])+cierre de caja)+/gi,
    (_, firstOccurrence: string) => firstOccurrence,
  );

  return normalizeWhitespace(collapsed);
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};


const paymentMethodKeyCandidates = [
  "method",
  "name",
  "paymentMethod",
  "payment_method",
  "label",
  "value",
  "title",
];

const methodIntroPatterns = [
  /m[e\u00E9]todos?\s+de\s+pago\s*[:\-]?\s*/gi,
  /pago\s+v[i\u00ED]a\s*/gi,
  /pago\s+con\s*/gi,
  /pagado\s+con\s*/gi,
  /pagado\s+v[i\u00ED]a\s*/gi,
];

const splitPaymentMethodCandidates = (value: string) => {
  if (!value) {
    return [] as string[];
  }

  let sanitized = value;
  methodIntroPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "");
  });

  const normalizedSeparators = sanitized
    .replace(/[\u2013\u2014]/g, ",")
    .replace(/\s+(?:y|e|and)\s+/gi, ",")
    .replace(/\s*&\s*/g, ",")
    .replace(/\s*\+\s*/g, ",")
    .replace(/\s*[|,;]\s*/g, ",")
    .replace(/\s+\/\s+/g, ",");

  return normalizedSeparators
    .split(",")
    .map((segment) => segment.replace(/^[\s:-]+/, "").replace(/[\s:-]+$/, ""))
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length > 0);
};

const applyStoreNameToRegisterLabel = (
  label: string | undefined,
  storeName: string | undefined,
) => {
  if (!storeName) {
    return label;
  }

  const trimmedStoreName = storeName.trim();
  if (!label || label.trim().length === 0) {
    return trimmedStoreName;
  }

  const replaced = label.replace(/Tienda\s+\d+/i, trimmedStoreName);
  if (replaced !== label) {
    return replaced;
  }

  if (label.toLowerCase().includes(trimmedStoreName.toLowerCase())) {
    return label;
  }

  return `${label} - ${trimmedStoreName}`;
};

export const decorateTransactionsWithStoreNames = (
  transactions: Transaction[],
  storeLookup: Record<number, string>,
) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return transactions;
  }

  return transactions.map((transaction) => {
    let storeId =
      typeof transaction.storeId === "number" ? transaction.storeId : null;
    if (storeId === null && typeof transaction.cashRegisterName === "string") {
      const storeMatch = transaction.cashRegisterName.match(/Tienda\s+(\d+)/i);
      if (storeMatch) {
        const parsedId = Number(storeMatch[1]);
        if (Number.isFinite(parsedId)) {
          storeId = parsedId;
        }
      }
    }
    const lookupName =
      storeId !== null && storeId !== undefined ? storeLookup[storeId] : undefined;

    if (!lookupName) {
      if (transaction.storeName) {
        return transaction;
      }
      return transaction;
    }

    const normalizedLabel = applyStoreNameToRegisterLabel(
      transaction.cashRegisterName,
      lookupName,
    );

    if (
      normalizedLabel === transaction.cashRegisterName &&
      transaction.storeName === lookupName
    ) {
      if (
        transaction.storeName &&
        transaction.storeId !== null &&
        transaction.storeId !== undefined
      ) {
        return transaction;
      }
      return {
        ...transaction,
        storeId: storeId ?? transaction.storeId,
        storeName: lookupName,
      };
    }

    return {
      ...transaction,
      cashRegisterName: normalizedLabel,
      storeId: storeId ?? transaction.storeId,
      storeName: lookupName,
    };
  });
};

const paymentAmountKeyCandidates = [
  "amount",
  "total",
  "value",
  "paid",
  "balance",
  "monto",
];

const paymentCurrencyKeyCandidates = ["currency", "currencySymbol", "symbol", "moneda"];

const extractNumericAmount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const matches = value.match(/-?\\d+(?:[.,]\\d+)?/g);
    if (!matches || matches.length === 0) {
      return null;
    }

    const candidate = matches[matches.length - 1]?.replace(/[^0-9,.-]/g, "") ?? "";
    if (!candidate) {
      return null;
    }

    const hasComma = candidate.includes(",");
    const hasDot = candidate.includes(".");

    let normalized = candidate;
    if (hasComma && hasDot) {
      if (candidate.lastIndexOf(",") > candidate.lastIndexOf(".")) {
        normalized = candidate.replace(/\\./g, "").replace(/,/g, ".");
      } else {
        normalized = candidate.replace(/,/g, "");
      }
    } else if (hasComma) {
      normalized = candidate.replace(/\\./g, "").replace(/,/g, ".");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const resolveCurrencySymbol = (record: Record<string, unknown>, fallback: string): string => {
  for (const key of paymentCurrencyKeyCandidates) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return fallback;
};

const formatPaymentMethodLabel = (value: string) => normalizeWhitespace(value);

const toSentenceCase = (value: string) => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const resolveLooseMethodLabel = (value: string) => {
  const normalized = normalizeWhitespace(value).toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("efectivo")) {
    return "En efectivo";
  }

  if (normalized.includes("transfer")) {
    return "Transferencia";
  }

  if (normalized.includes("yape")) {
    return "Yape";
  }

  if (normalized.includes("plin")) {
    return "Plin";
  }

  if (
    normalized.includes("visa") ||
    normalized.includes("master") ||
    normalized.includes("tarjeta") ||
    normalized.includes("credito") ||
    normalized.includes("debito")
  ) {
    return "Tarjeta";
  }

  if (normalized.includes("dep")) {
    return "Deposito";
  }

  if (normalized.includes("cheque")) {
    return "Cheque";
  }

  return toSentenceCase(value);
};

const consolidateLooseTransferEntries = (
  values: string[],
  fallbackCurrency: string,
  totalAmount?: number,
): string[] => {
  if (values.length === 0) {
    return [];
  }

  const joined = normalizeWhitespace(values.join(" "));

  if (!/m[e]todos?\s+de\s+pago/i.test(joined)) {
    return [];
  }

  const methodPattern = /(en\s+efectivo|efectivo|transferencia|yape|plin|tarjeta|visa|mastercard|amex|american\s+express|dep[o]sito|deposito|cheque|cheques)/gi;

  const matches: Array<{ label: string; start: number; end: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = methodPattern.exec(joined)) !== null) {
    matches.push({ label: match[0], start: match.index, end: joined.length });
  }

  if (matches.length === 0) {
    return [];
  }

  matches.forEach((entry, index) => {
    entry.end = index + 1 < matches.length ? matches[index + 1].start : joined.length;
  });

  const resolvedCurrency = (fallbackCurrency ?? "S/.").trim() || "S/.";
  const totalReference = typeof totalAmount === "number" && Number.isFinite(totalAmount)
    ? Math.abs(totalAmount)
    : null;

  const consolidated: string[] = [];

  matches.forEach((entry) => {
    const segment = normalizeWhitespace(joined.slice(entry.start, entry.end));
    const numericMatches = Array.from(segment.matchAll(/-?\d+(?:[.,]\d+)?/g)).map((item) => parseNumber(item[0] ?? ""));
    const uniqueNumbers = Array.from(
      new Set(
        numericMatches
          .filter((value) => Number.isFinite(value))
          .map((value) => Math.abs(Number(value.toFixed(2)))),
      ),
    ).sort((a, b) => a - b);

    let chosenAmount: number | null = null;

    if (uniqueNumbers.length === 1) {
      chosenAmount = uniqueNumbers[0];
    } else if (uniqueNumbers.length > 1) {
      const filtered = totalReference
        ? uniqueNumbers.filter((value) => Math.abs(value - totalReference) > 0.009)
        : uniqueNumbers;
      if (filtered.length > 0) {
        chosenAmount = filtered[0];
      } else {
        chosenAmount = uniqueNumbers[0];
      }
    }

    const label = resolveLooseMethodLabel(entry.label);
    if (chosenAmount !== null && Number.isFinite(chosenAmount)) {
      consolidated.push(`${label}: ${resolvedCurrency} ${chosenAmount.toFixed(2)}`);
    } else {
      consolidated.push(label);
    }
  });

  return consolidated;
};

const formatPaymentMethodsWithAmounts = (
  raw: unknown,
  fallbackCurrency: string,
  totalAmount?: number,
): string[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const results: string[] = [];

  const looseCandidates: string[] = [];

  raw.forEach((entry) => {
    if (typeof entry === "string") {
      const trimmed = normalizeWhitespace(entry);
      if (trimmed) {
        results.push(trimmed);
      } else if (trimmed === "") {
        // Ignore empty strings
      }
      if (trimmed) {
        looseCandidates.push(trimmed);
      }
      return;
    }

    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;

      const methodCandidate = paymentMethodKeyCandidates
        .map((key) => record[key])
        .find(
          (value): value is string =>
            typeof value === "string" && normalizeWhitespace(value).length > 0,
        );

      if (methodCandidate) {
        const label = formatPaymentMethodLabel(methodCandidate);

        let amount: number | null = null;
        for (const key of paymentAmountKeyCandidates) {
          amount = extractNumericAmount(record[key]);
          if (amount !== null) {
            break;
          }
        }

        if (amount !== null) {
          const currency = resolveCurrencySymbol(record, fallbackCurrency);
          const formattedAmount = `${currency} ${Math.abs(amount).toFixed(2)}`;
          results.push(`${label}: ${formattedAmount}`);
          return;
        }

        results.push(label);
        looseCandidates.push(label);
        return;
      }

      const stringValues = Object.values(record).filter(
        (value): value is string => typeof value === "string" && normalizeWhitespace(value).length > 0,
      );

      if (stringValues.length > 0) {
        const normalized = normalizeWhitespace(stringValues[0]);
        results.push(normalized);
        looseCandidates.push(normalized);
      }
    }
  });

  if (results.length > 0) {
    return results;
  }

  if (looseCandidates.length > 0) {
    const consolidated = consolidateLooseTransferEntries(looseCandidates, fallbackCurrency, totalAmount);
    if (consolidated.length > 0) {
      return consolidated;
    }
  }

  return results;
};

const normalizePaymentMethods = (raw: unknown): string[] => {
  const results: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: string) => {
    const cleaned = normalizeWhitespace(candidate)
      .replace(/^[|]+/, "")
      .replace(/[|]+$/, "")
      .trim();

    if (!cleaned) {
      return;
    }

    const key = cleaned.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(cleaned);
    }
  };

  const processValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === "string") {
      const candidates = splitPaymentMethodCandidates(value);
      if (candidates.length === 0) {
        pushCandidate(value);
      } else {
        candidates.forEach(pushCandidate);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(processValue);
      return;
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      let handled = false;

      for (const key of paymentMethodKeyCandidates) {
        if (typeof record[key] === "string") {
          processValue(record[key]);
          handled = true;
        }
      }

      if (!handled) {
        const stringValues = Object.values(record).filter((item) => typeof item === "string");
        if (stringValues.length > 0) {
          stringValues.forEach(processValue);
          handled = true;
        }
      }

      if (!handled) {
        const stringified = String(value);
        if (stringified && stringified !== "[object Object]") {
          processValue(stringified);
        }
      }
      return;
    }

    processValue(String(value));
  };

  processValue(raw);
  return results;
};

export const sortClosuresByDateDesc = <T extends { createdAt?: string | Date }>(values: T[]): T[] =>
  [...values].sort((a, b) => {
    const aTime = new Date(a?.createdAt ?? 0).getTime();
    const bTime = new Date(b?.createdAt ?? 0).getTime();
    return bTime - aTime;
  });

const normalizeClosureId = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    if (value.startsWith("closure-")) {
      return value;
    }
    return value.length > 0 ? `closure-${value}` : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `closure-${value}`;
  }

  return null;
};

export const resolveLatestClosureOverride = (
  activeRegister: { initialBalance?: unknown } | null,
  closuresList: any[],
): { amount: number | null; transactionId: string | null } => {
  if (!activeRegister || !Array.isArray(closuresList) || closuresList.length === 0) {
    return { amount: null, transactionId: null };
  }

  const parsedInitial = Number(activeRegister.initialBalance);
  if (!Number.isFinite(parsedInitial)) {
    return { amount: null, transactionId: null };
  }

  const normalizedAmount = Number(parsedInitial.toFixed(2));
  const latestClosureId = normalizeClosureId(closuresList[0]?.id);

  if (!latestClosureId) {
    return { amount: null, transactionId: null };
  }

  return { amount: normalizedAmount, transactionId: latestClosureId };
};

export const withLatestClosureOverride = <T extends Record<string, any>>(
  closuresList: T[],
  overrideAmount: number | null,
): T[] => {
  if (overrideAmount === null) {
    return closuresList;
  }

  return closuresList.map((closure, index) => {
    if (index === 0) {
      return {
        ...closure,
        nextOpeningBalance: overrideAmount,
      };
    }
    return closure;
  });
};

const extractPaymentMethodsFromText = (value?: string | null) => {
  if (!value) {
    return [] as string[];
  }

  const methods = new Set<string>();
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/\.+/g, ".")
    .trim();

  const patterns = [
    /pago\s+v[isa­]a\s+([^.;]+)/gi,
    /m[e]todo[s]?\s+de\s+pago[:\s]+([^.;]+)/gi,
  ];

  patterns.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(normalized)) !== null) {
      const rawSegment = match[1] ?? "";
      rawSegment
        .split(/[,/|]/)
        .map((segment) => segment.split(/\by\b/i))
        .flat()
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 1)
        .forEach((segment) => {
          const cleaned = segment
            .replace(/[-]+$/g, "")
            .replace(/^[\-\s]+/, "")
            .trim();
          if (cleaned) {
            methods.add(cleaned.toUpperCase());
          }
        });
    }
  });

  return Array.from(methods.values());
};

const parseNumber = (value: string) => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const PAYMENT_SUMMARY_METHODS = [
  "Efectivo",
  "Yape",
  "Plin",
  "Tarjeta",
  "Transferencia",
] as const;
export type PaymentSummaryKey = (typeof PAYMENT_SUMMARY_METHODS)[number];

export const PAYMENT_SUMMARY_LABELS: Record<PaymentSummaryKey, string> = {
  Efectivo: "EN EFECTIVO",
  Yape: "Yape",
  Plin: "Plin",
  Tarjeta: "Tarjeta",
  Transferencia: "Transferencia",
};

export const identifyPaymentSummaryMethod = (value: string): PaymentSummaryKey | null => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) {
    return null;
  }
  if (isCashPaymentMethod(normalized)) {
    return "Efectivo";
  }
  if (/(tarjeta|visa|master|credito|debito|amex|american express)/.test(normalized)) {
    return "Tarjeta";
  }
  if (/transfer/.test(normalized)) {
    return "Transferencia";
  }
  if (/yape/.test(normalized)) {
    return "Yape";
  }
  if (/plin/.test(normalized)) {
    return "Plin";
  }
  return null;
};

export const extractAmountFromMethodEntry = (value: string): number | null => {
  if (!value) {
    return null;
  }
  const matches = value.match(/-?\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }
  const candidate = matches[matches.length - 1];
  const amount = parseNumber(candidate);
  return Number.isFinite(amount) ? amount : null;
};

export const resolveSignedAmount = (rawAmount: number, entryType?: string | null) => {
  if (!Number.isFinite(rawAmount)) {
    return 0;
  }

  if ((entryType ?? "").toUpperCase() === "EXPENSE") {
    return rawAmount < 0 ? rawAmount : -rawAmount;
  }

  return rawAmount;
};

export const formatSignedCurrency = (amount: number, currencySymbol: string) => {
  const resolvedCurrency = (currencySymbol ?? "S/.").trim() || "S/.";
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = `${resolvedCurrency} ${Math.abs(safeAmount).toFixed(2)}`;
  return safeAmount < 0 ? `- ${formatted}` : formatted;
};

export const formatPaymentMethodsForReport = (
  methods: string[] | null | undefined,
  entryType?: string | null,
) => {
  if (!methods || methods.length === 0) {
    return "-";
  }

  const isExpense = (entryType ?? "").toUpperCase() === "EXPENSE";

  const formattedEntries = methods
    .map((rawValue) => {
      const normalized = normalizeWhitespace(rawValue ?? "");
      if (!normalized) {
        return null;
      }

      const colonIndex = normalized.indexOf(":");
      if (colonIndex === -1) {
        if (!isExpense || normalized.startsWith("-")) {
          return normalized;
        }
        return `- ${normalized}`;
      }

      const label = normalizeWhitespace(normalized.slice(0, colonIndex));
      const amountText = normalizeWhitespace(normalized.slice(colonIndex + 1));

      if (!amountText) {
        return label;
      }

      const resolvedAmount = isExpense && !amountText.startsWith("-") ? `- ${amountText}` : amountText;
      return `${label}: ${resolvedAmount}`;
    })
    .filter((entry): entry is string => Boolean(entry));

  return formattedEntries.length > 0 ? formattedEntries.join(" | ") : "-";
};

export const isCashPaymentMethod = (value: string) => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized.includes("efectivo");
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: "Ingresos",
  EXPENSE: "Retiros",
  CLOSURE: "Cierre",
};

export type CashReportRow = {
  timestamp: string;
  type: string;
  amount: string;
  openingBalance: string;
  cashAvailable: string;
  paymentMethods: string;
  employee: string;
  client: string;
  document: string;
  notes: string;
  voucher: string;
};

export const REPORT_COLUMNS: { key: keyof CashReportRow; header: string }[] = [
  { key: "timestamp", header: "Fecha/Hora" },
  { key: "type", header: "Tipo" },
  { key: "amount", header: "Monto" },
  { key: "openingBalance", header: "Saldo Inicial" },
  { key: "cashAvailable", header: "Efectivo Disponible" },
  { key: "paymentMethods", header: "Metodos de Pago" },
  { key: "employee", header: "Encargado" },
  { key: "client", header: "Cliente" },
  { key: "document", header: "Documento" },
  { key: "notes", header: "Notas" },
  { key: "voucher", header: "Comprobante" },
];

type SaleItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

const normalizeTransactionSaleItems = (
  items?: Transaction["saleItems"],
): SaleItem[] => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  return items
    .map((item) => {
      const name = normalizeWhitespace(item.name ?? "");
      if (!name) {
        return null;
      }
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? 0);
      return { name, quantity, unitPrice };
    })
    .filter((item): item is SaleItem => item !== null);
};

const extractSaleItemsFromDescription = (description: string) => {
  const items = new Map<string, SaleItem>();
  const cleaned = normalizeWhitespace(description);
  const itemRegex = /([A-Za-z0-9().\- ]+?)(?: -)? *Cantidad: *([0-9.,]+) *,? *Precio *Unitario: *([0-9.,]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(cleaned)) !== null) {
    const name = normalizeWhitespace(match[1] ?? "");
    if (!name) continue;

    const quantity = parseNumber(match[2] ?? "0");
    const unitPrice = parseNumber(match[3] ?? "0");
    const key = `${name.toLowerCase()}|${unitPrice}`;

    const existing = items.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.set(key, { name, quantity, unitPrice });
    }
  }

  return Array.from(items.values());
};

const getTimestampKey = (timestamp: Transaction["timestamp"]) => {
  const parsedDate = new Date(timestamp as any);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }
  return Math.floor(parsedDate.getTime() / 1000).toString();
};

export const mergeSaleTransactions = (transactions: Transaction[]) => {
  type SaleAggregation = {
    transaction: Transaction;
    prefix: string;
    fallbackDescriptions: string[];
    items: Map<string, SaleItem>;
    originalItems: SaleItem[] | null;
    breakdown: Map<string, number>;
    methodAmounts: Map<string, Set<number>>;
    fingerprints: Set<string>;
    order: number;
    amounts: Set<number>;
  };

  const aggregatedSales = new Map<string, SaleAggregation>();
  const nonSaleTransactions: { transaction: Transaction; order: number }[] = [];

  transactions.forEach((transaction, index) => {
    const description = transaction.description ?? "";
    const providedItems = normalizeTransactionSaleItems(transaction.saleItems);
    const saleItems =
      providedItems.length > 0
        ? providedItems
        : extractSaleItemsFromDescription(description);
    const hasSaleIndicators =
      saleItems.length > 0 ||
      /venta registrada:/i.test(description) ||
      isSaleTransaction(description) ||
      Boolean(transaction.voucher) ||
      Boolean(transaction.invoiceUrl);

    if (!hasSaleIndicators) {
      nonSaleTransactions.push({ transaction, order: index });
      return;
    }

    const fingerprintItems = saleItems
      .map((item) => `${item.name.toLowerCase()}|${item.unitPrice.toFixed(4)}|${item.quantity.toFixed(4)}`)
      .sort()
      .join(";");
    const { prefix, suffix, normalized } = splitSaleDescription(description);
    const keyParts = [
      transaction.type,
      transaction.voucher ?? "",
      normalized,
      getTimestampKey(transaction.timestamp),
      String(transaction.cashRegisterId ?? ""),
      transaction.clientDocument ?? "",
      transaction.clientName ?? "",
    ];
    const aggregationKey = keyParts.join("|");
    const explicitMethods = normalizePaymentMethods(transaction.paymentMethods ?? []);
    const methodsFromText = extractPaymentMethodsFromText(prefix || description);
    const combinedMethods = [...explicitMethods];
    const combinedMethodSet = new Set(combinedMethods.map((method) => method.toUpperCase()));
    methodsFromText.forEach((method) => {
      const normalizedMethod = method.toUpperCase();
      if (!combinedMethodSet.has(normalizedMethod)) {
        combinedMethodSet.add(normalizedMethod);
        combinedMethods.push(method);
      }
    });
    const hasExplicitMethods = explicitMethods.length > 0;
    const currentMethods = combinedMethods.length > 0 ? combinedMethods : [...methodsFromText];
    const amountValue = Number(transaction.amount);
    const absoluteTransactionAmount = Math.abs(amountValue);
    const prefixForFingerprint = stripPaymentMethodDetails(prefix) || prefix;
    const normalizedPrefixForFingerprint = normalizeWhitespace(prefixForFingerprint.toLowerCase());
    const duplicateFingerprint = `${normalizedPrefixForFingerprint}|${transaction.voucher ?? ""}|${fingerprintItems}`;

    let saleEntry = aggregatedSales.get(aggregationKey);
    let isDuplicate = false;

    if (!saleEntry) {
      saleEntry = {
        transaction: {
          ...transaction,
          amount: amountValue,
          paymentMethods: [...currentMethods],
        },
        prefix,
        fallbackDescriptions: suffix ? [suffix] : [],
        items: new Map<string, SaleItem>(),
        originalItems: saleItems.length > 0 ? saleItems.map((item) => ({ ...item })) : null,
        breakdown: new Map<string, number>(),
        methodAmounts: new Map<string, Set<number>>(),
        fingerprints: new Set<string>([duplicateFingerprint]),
        order: index,
        amounts: new Set<number>([amountValue]),
      };
      aggregatedSales.set(aggregationKey, saleEntry);
    } else {
      isDuplicate = saleEntry.fingerprints.has(duplicateFingerprint);
      if (!isDuplicate) {
        saleEntry.fingerprints.add(duplicateFingerprint);
        if (suffix) {
          saleEntry.fallbackDescriptions.push(suffix);
        }
      }
    }

    saleEntry.amounts.add(amountValue);

    if (transaction.voucher && !saleEntry.transaction.voucher) {
      saleEntry.transaction.voucher = transaction.voucher;
    }
    if (transaction.invoiceUrl && !saleEntry.transaction.invoiceUrl) {
      saleEntry.transaction.invoiceUrl = transaction.invoiceUrl;
    }

    const methodSet = new Set((saleEntry.transaction.paymentMethods ?? []).map((method) => method.toUpperCase()));
    const aggregatedMethods: string[] = saleEntry.transaction.paymentMethods ?? [];
    currentMethods.forEach((method) => {
      if (method) {
        const normalizedMethod = method.toUpperCase();
        if (!methodSet.has(normalizedMethod)) {
          methodSet.add(normalizedMethod);
          aggregatedMethods.push(method);
        }
      }
    });
    saleEntry.transaction.paymentMethods = aggregatedMethods;

    if (!saleEntry.originalItems && saleItems.length > 0) {
      saleEntry.originalItems = saleItems.map((item) => ({ ...item }));
    }

    if (!isDuplicate) {
      saleItems.forEach((item) => {
        const key = `${item.name.toLowerCase()}|${item.unitPrice}`;
        const existingItem = saleEntry.items.get(key);
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          saleEntry.items.set(key, { ...item });
        }
      });
    }
    const methodsForBreakdown = hasExplicitMethods ? explicitMethods : [];
    methodsForBreakdown.forEach((method) => {
      if (!method) {
        return;
      }
      const colonIndex = method.indexOf(":");
      const rawLabel = colonIndex === -1 ? method : method.slice(0, colonIndex);
      const normalizedLabel = formatPaymentMethodLabel(rawLabel || method);
      if (!normalizedLabel) {
        return;
      }

      const displayLabel = normalizedLabel.toUpperCase();
      const explicitAmount = extractAmountFromMethodEntry(method);
      const resolvedAmount = explicitAmount !== null ? Math.abs(explicitAmount) : absoluteTransactionAmount;
      const amountIdentifier =
        explicitAmount !== null
          ? Number(Math.abs(explicitAmount).toFixed(2))
          : Number(absoluteTransactionAmount.toFixed(2));

      const amountSet = saleEntry.methodAmounts.get(displayLabel) ?? new Set<number>();
      if (amountSet.has(amountIdentifier)) {
        return;
      }

      amountSet.add(amountIdentifier);
      saleEntry.methodAmounts.set(displayLabel, amountSet);
      const previousAmount = saleEntry.breakdown.get(displayLabel) ?? 0;
      saleEntry.breakdown.set(displayLabel, previousAmount + resolvedAmount);
    });
  });

  const mergedTransactions = [
    ...nonSaleTransactions,
    ...Array.from(aggregatedSales.values()).map((saleEntry) => {
      const breakdownEntries = Array.from(saleEntry.breakdown.entries());
      const hasBreakdownAmounts = breakdownEntries.length > 0;
      const currencySymbol = (saleEntry.transaction.currency ?? "S/.").trim();
      const formattedBreakdown = breakdownEntries.map(([method, amount]) => {
        const amountDisplay = `${currencySymbol} ${amount.toFixed(2)}`.trim();
        return `${method}: ${amountDisplay}`;
      });
      const breakdownText = hasBreakdownAmounts
        ? `Metodos de pago: ${formattedBreakdown.join(" | ")}`
        : "";
      const formattedPaymentMethods = hasBreakdownAmounts && formattedBreakdown.length > 0
        ? formattedBreakdown
        : saleEntry.transaction.paymentMethods ?? [];
      saleEntry.transaction.paymentMethods = formattedPaymentMethods;
      const itemsForDisplay = saleEntry.originalItems?.length
        ? saleEntry.originalItems
        : Array.from(saleEntry.items.values());

      const itemSegments = itemsForDisplay.map((item) => {
        const quantityStr = Number.isInteger(item.quantity)
          ? item.quantity.toString()
          : item.quantity.toFixed(2);
        return `${item.name} - Cantidad: ${quantityStr}, Precio Unitario: ${item.unitPrice.toFixed(2)}`;
      });

      const descriptionParts: string[] = [];
      if (saleEntry.prefix) {
        const cleanedPrefix = stripPaymentMethodDetails(saleEntry.prefix);
        if (cleanedPrefix) {
          descriptionParts.push(normalizeWhitespace(cleanedPrefix));
        }
      }
      if (hasBreakdownAmounts && breakdownText) {
        descriptionParts.push(breakdownText);
      }
      if (itemSegments.length > 0) {
        descriptionParts.push(`Venta registrada: ${itemSegments.join(" | ")}`);
      } else if (saleEntry.fallbackDescriptions.length > 0) {
        descriptionParts.push(
          normalizeWhitespace(`Venta registrada: ${saleEntry.fallbackDescriptions[0]}`)
        );
      } else if (saleEntry.transaction.description) {
        descriptionParts.push(normalizeWhitespace(saleEntry.transaction.description));
      }

      const finalDescription = normalizeWhitespace(descriptionParts.join(" "));
      if (finalDescription) {
        saleEntry.transaction.description = finalDescription;
      }

      let totalAmount = 0;
      const itemsForTotal = saleEntry.originalItems?.length
        ? saleEntry.originalItems
        : saleEntry.items.size > 0
        ? Array.from(saleEntry.items.values())
        : [];

      if (itemsForTotal.length > 0) {
        itemsForTotal.forEach((item) => {
          totalAmount += item.quantity * item.unitPrice;
        });
      }
      if (totalAmount === 0) {
        saleEntry.amounts.forEach((amount) => {
          totalAmount += amount;
        });
      }
      saleEntry.transaction.amount = Number(totalAmount.toFixed(2));

      return {
        transaction: saleEntry.transaction,
        order: saleEntry.order,
      };
    }),
  ];

  mergedTransactions.sort((a, b) => a.order - b.order);
  return mergedTransactions.map((entry) => entry.transaction);
};

const toValidDate = (value: unknown): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const adaptTransaction = (transaction: any): Transaction => {
  const timestamp = toValidDate(transaction?.timestamp ?? transaction?.createdAt);
  const createdAt = toValidDate(transaction?.createdAt ?? transaction?.timestamp);
  const currencyCandidates = [transaction?.currency, transaction?.currencySymbol];
  const currencySymbol = currencyCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  const resolvedCurrency = (currencySymbol ?? "S/.").trim() || "S/.";
  const resolvedStoreId = toNullableNumber(
    transaction?.storeId ??
      transaction?.cashRegister?.storeId ??
      (transaction?.cashRegister?.store?.id ?? null),
  );
  const resolvedStoreNameCandidate = [
    transaction?.storeName,
    transaction?.cashRegister?.store?.name,
  ].find((value) => typeof value === "string" && value.trim().length > 0);
  const resolvedStoreName =
    typeof resolvedStoreNameCandidate === "string"
      ? resolvedStoreNameCandidate.trim()
      : undefined;
  const formattedPaymentMethods = formatPaymentMethodsWithAmounts(
    transaction?.paymentMethods ?? [],
    resolvedCurrency,
    Number(transaction?.amount ?? 0),
  );
  const normalizedMethods = normalizePaymentMethods(
    formattedPaymentMethods.length > 0 ? formattedPaymentMethods : transaction?.paymentMethods ?? [],
  );

  return {
    id: String(transaction?.id),
    cashRegisterId: toNullableNumber(transaction?.cashRegisterId ?? transaction?.cashRegister?.id),
    cashRegisterName: applyStoreNameToRegisterLabel(
      transaction?.cashRegisterName ?? transaction?.cashRegister?.name ?? undefined,
      resolvedStoreName,
    ),
    type: transaction?.type ?? transaction?.internalType ?? "UNKNOWN",
    amount: Number(transaction?.amount) || 0,
    createdAt,
    timestamp,
    userId: toNullableNumber(transaction?.userId ?? transaction?.user?.id),
    employee: transaction?.employee || "",
    description: transaction?.description || "",
    paymentMethods: normalizedMethods,
    currency: resolvedCurrency,
    clientName: transaction?.clientName ?? null,
    clientDocument: transaction?.clientDocument ?? null,
    clientDocumentType: transaction?.clientDocumentType ?? null,
    voucher: transaction?.voucher ?? null,
    invoiceUrl: transaction?.invoiceUrl ?? null,
    internalType: transaction?.type ?? transaction?.internalType ?? "UNKNOWN",
    notes: transaction?.notes ?? undefined,
    storeId: resolvedStoreId,
    storeName: resolvedStoreName,
    openingBalance: toNullableNumber(transaction?.openingBalance),
    closingBalance: toNullableNumber(transaction?.closingBalance ?? transaction?.amount),
    totalIncome: toNullableNumber(transaction?.totalIncome),
    totalExpense: toNullableNumber(transaction?.totalExpense),
    nextOpeningBalance: toNullableNumber(
      (transaction as any)?.nextOpeningBalance ?? (transaction as any)?.nextInitialBalance ?? null,
    ),
    saleItems: normalizeTransactionSaleItems(transaction?.saleItems),
  } as Transaction;
};

export const computeClosureNextOpeningMap = (
  closuresList: Array<Record<string, any>>,
  latestOverride: number | null,
): Map<string, number> => {
  const result = new Map<string, number>();

  if (!Array.isArray(closuresList) || closuresList.length === 0) {
    return result;
  }

  closuresList.forEach((closure, index, array) => {
    const closureId = normalizeClosureId(closure?.id);
    if (!closureId) {
      return;
    }

    let candidate = toNullableNumber(
      (closure as any)?.nextOpeningBalance ?? (closure as any)?.nextInitialBalance ?? null,
    );

    if (candidate === null) {
      if (index === 0) {
        candidate = latestOverride !== null ? Number(latestOverride) : null;
      } else {
        const previousClosure = array[index - 1];
        candidate = toNullableNumber((previousClosure as any)?.openingBalance ?? null);
      }
    }

    if (candidate !== null) {
      result.set(closureId, candidate);
    }
  });

  return result;
};

export const applyNextOpeningBalanceToClosures = (
  closuresList: any[],
  nextOpeningMap: Map<string, number>,
): any[] => {
  if (!Array.isArray(closuresList) || nextOpeningMap.size === 0) {
    return closuresList;
  }

  return closuresList.map((closure) => {
    const closureId = normalizeClosureId(closure?.id);
    if (!closureId) {
      return closure;
    }

    const existing = toNullableNumber(
      (closure as any)?.nextOpeningBalance ?? (closure as any)?.nextInitialBalance ?? null,
    );

    const candidate = nextOpeningMap.get(closureId);
    if (candidate === undefined) {
      return closure;
    }

    if (existing !== null) {
      return closure;
    }

    return {
      ...closure,
      nextOpeningBalance: candidate,
    };
  });
};

export const applyNextOpeningBalanceToTransactions = (
  transactions: Transaction[],
  nextOpeningMap: Map<string, number>,
): Transaction[] => {
  if (nextOpeningMap.size === 0) {
    return transactions;
  }

  return transactions.map((transaction) => {
    const entryType = transaction.internalType ?? transaction.type;
    if (entryType !== "CLOSURE") {
      return transaction;
    }

    const closureId = normalizeClosureId(transaction.id) ?? transaction.id;
    if (!closureId) {
      return transaction;
    }

    const candidate = nextOpeningMap.get(closureId);
    if (candidate === undefined) {
      return transaction;
    }

    return {
      ...transaction,
      nextOpeningBalance: candidate,
    };
  });
};

export const ymdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
