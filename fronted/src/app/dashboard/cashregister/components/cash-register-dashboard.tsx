﻿"use client"

import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Transaction } from "../types/cash-register"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CashTransferForm from "./cash-transfer-form"
import CashClosureForm from "./cash-closure-form"
import TransactionHistory from "./transaction-history"
import { createCashRegister, getActiveCashRegister, getCashRegisterBalance, getClosureByDate, getClosuresByStore, getTodayTransactions, getTransactionsByDate } from "../cashregister.api"
import { getStores } from "../../stores/stores.api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Plus, FileSpreadsheet, FileText } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { format, isSameDay } from "date-fns"; // ya lo tienes en tus imports

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

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const sanitizeClosureNotes = (value: string) => {
  if (!value) {
    return "";
  }

  const collapsed = value.replace(
    /(cierre de caja)(?:(?:\s|[|,.;:-])+cierre de caja)+/gi,
    (_, firstOccurrence: string) => firstOccurrence,
  );

  return normalizeWhitespace(collapsed);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const downloadBlob = (blob: Blob, filename: string) => {
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
    .replace(/[\/,|;]+/g, ",");

  return normalizedSeparators
    .split(",")
    .map((segment) => segment.replace(/^[\s:-]+/, "").replace(/[\s:-]+$/, ""))
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length > 0);
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

const sortClosuresByDateDesc = <T extends { createdAt?: string | Date }>(values: T[]): T[] =>
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

const resolveLatestClosureOverride = (
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

const withLatestClosureOverride = <T extends Record<string, any>>(
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

const withClosureTransactionOverride = (
  transactions: Transaction[],
  overrideAmount: number | null,
  targetClosureId: string | null,
): Transaction[] => {
  if (overrideAmount === null || !targetClosureId) {
    return transactions;
  }

  return transactions.map((transaction) => {
    const entryType = transaction.internalType ?? transaction.type;
    if (entryType === "CLOSURE" && transaction.id === targetClosureId) {
      return {
        ...transaction,
        nextOpeningBalance: overrideAmount,
      };
    }
    return transaction;
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
    /pago\s+v[ií]a\s+([^.;]+)/gi,
    /m[eé]todo[s]?\s+de\s+pago[:\s]+([^.;]+)/gi,
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

const PAYMENT_SUMMARY_METHODS = [
  "Efectivo",
  "Yape",
  "Plin",
  "Tarjeta",
  "Transferencia",
] as const;
type PaymentSummaryKey = (typeof PAYMENT_SUMMARY_METHODS)[number];

const PAYMENT_SUMMARY_LABELS: Record<PaymentSummaryKey, string> = {
  Efectivo: "EN EFECTIVO",
  Yape: "Yape",
  Plin: "Plin",
  Tarjeta: "Tarjeta",
  Transferencia: "Transferencia",
};

const identifyPaymentSummaryMethod = (value: string): PaymentSummaryKey | null => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) {
    return null;
  }
  if (isCashPaymentMethod(normalized)) {
    return "Efectivo";
  }
  if (/(tarjeta|visa|master|credito|crédito|debito|débito|amex|american express)/.test(normalized)) {
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

const extractAmountFromMethodEntry = (value: string): number | null => {
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

const resolveSignedAmount = (rawAmount: number, entryType?: string | null) => {
  if (!Number.isFinite(rawAmount)) {
    return 0;
  }

  if ((entryType ?? "").toUpperCase() === "EXPENSE") {
    return rawAmount < 0 ? rawAmount : -rawAmount;
  }

  return rawAmount;
};

const formatSignedCurrency = (amount: number, currencySymbol: string) => {
  const resolvedCurrency = (currencySymbol ?? "S/.").trim() || "S/.";
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = `${resolvedCurrency} ${Math.abs(safeAmount).toFixed(2)}`;
  return safeAmount < 0 ? `- ${formatted}` : formatted;
};

const formatPaymentMethodsForReport = (
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

const isCashPaymentMethod = (value: string) => {
  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized.includes("efectivo");
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  INCOME: "Ingresos",
  EXPENSE: "Retiros",
  CLOSURE: "Cierre",
};

const REPORT_COLUMNS: { key: keyof CashReportRow; header: string }[] = [
  { key: "timestamp", header: "Fecha/Hora" },
  { key: "type", header: "Tipo" },
  { key: "amount", header: "Monto" },
  { key: "openingBalance", header: "Saldo Inicial" },
  { key: "cashAvailable", header: "Efectivo Disponible" },
  { key: "paymentMethods", header: "Métodos de Pago" },
  { key: "employee", header: "Encargado" },
  { key: "client", header: "Cliente" },
  { key: "document", header: "Documento" },
  { key: "notes", header: "Notas" },
  { key: "voucher", header: "Comprobante" },
];

type CashReportRow = {
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

type SaleItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

const extractSaleItems = (description: string) => {
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

const mergeSaleTransactions = (transactions: Transaction[]) => {
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
    const saleItems = extractSaleItems(description);
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
      const amountSet = saleEntry.methodAmounts.get(method) ?? new Set<number>();
      if (!amountSet.has(amountValue)) {
        amountSet.add(amountValue);
        saleEntry.methodAmounts.set(method, amountSet);
        const previousAmount = saleEntry.breakdown.get(method) ?? 0;
        saleEntry.breakdown.set(method, previousAmount + amountValue);
      }
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

const adaptTransaction = (transaction: any): Transaction => {
  const timestamp = toValidDate(transaction?.timestamp ?? transaction?.createdAt);
  const createdAt = toValidDate(transaction?.createdAt ?? transaction?.timestamp);
  const normalizedMethods = normalizePaymentMethods(transaction?.paymentMethods ?? []);
  const currencyCandidates = [transaction?.currency, transaction?.currencySymbol];
  const currencySymbol = currencyCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  const resolvedCurrency = (currencySymbol ?? "S/.").trim() || "S/.";

  return {
    id: String(transaction?.id),
    cashRegisterId: toNullableNumber(transaction?.cashRegisterId ?? transaction?.cashRegister?.id),
    cashRegisterName: transaction?.cashRegisterName ?? transaction?.cashRegister?.name ?? undefined,
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
    openingBalance: toNullableNumber(transaction?.openingBalance),
    closingBalance: toNullableNumber(transaction?.closingBalance ?? transaction?.amount),
    totalIncome: toNullableNumber(transaction?.totalIncome),
    totalExpense: toNullableNumber(transaction?.totalExpense),
    nextOpeningBalance: toNullableNumber(
      (transaction as any)?.nextOpeningBalance ?? (transaction as any)?.nextInitialBalance ?? null,
    ),
  } as Transaction;
};

// arriba del componente
const ymdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export default function CashRegisterDashboard() {

  const [isFetchingTransactions, setIsFetchingTransactions] = useState(false);
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // Validar sesión
  useEffect(() => {
    async function check() {
      const userData = await getUserDataFromToken();
      if (!userData || !(await isTokenValid())) {
        router.replace("/login");
      } else {
        setUserId(userData.id);
      }
      setCheckingSession(false);
    }
    check();
  }, [router]);

  // -------------------- HOOKS PRINCIPALES --------------------
  const [balance, setBalance] = useState(0)
  const [initialBalance, setInitialBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsForBalance, setTransactionsForBalance] = useState<Transaction[]>([])
  const [storeId, setStoreId] = useState<number | null>(null); // Estado para la tienda seleccionada
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]); // Lista de tiendas
  const [hasCashRegister, setHasCashRegister] = useState(true); // 👈 Estado nuevo
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [activeCashRegisterId, setActiveCashRegisterId] = useState<number | null>(null);
  const [closures, setClosures] = useState<any[]>([]);
  const [dailyClosureInfo, setDailyClosureInfo] = useState<{
    openingBalance: number;
    closingBalance: number;
  } | null>(null);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [initialAmountToOpen, setInitialAmountToOpen] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const isToday = isSameDay(selectedDate, new Date());

  const selectedStoreName = useMemo(() => {
    if (storeId === null) {
      return "Sin tienda"
    }
    const store = stores.find((item) => item.id === storeId)
    return store?.name ?? "Sin tienda"
  }, [storeId, stores])

  const reportRows = useMemo<CashReportRow[]>(() => {
    return transactions.map((transaction) => {
      const rawDate = transaction.timestamp
        ? new Date(transaction.timestamp as any)
        : transaction.createdAt
        ? new Date(transaction.createdAt as any)
        : null
      const hasValidDate = rawDate instanceof Date && !Number.isNaN(rawDate.getTime())
      const formattedDate = hasValidDate && rawDate ? format(rawDate, "dd/MM/yyyy HH:mm:ss") : "-"
      const currencySymbol = (transaction.currency ?? "S/.").trim()
      const entryType = transaction.internalType ?? transaction.type
      const signedAmount = resolveSignedAmount(Number(transaction.amount ?? 0), entryType)
      const amountDisplay = formatSignedCurrency(signedAmount, currencySymbol)
      const paymentMethodsDisplay = formatPaymentMethodsForReport(transaction.paymentMethods, entryType)

      const normalizedEntryType = (entryType ?? "").toUpperCase()
      const isClosure = normalizedEntryType === "CLOSURE"
      const openingBalanceDisplay = isClosure && transaction.openingBalance !== null && transaction.openingBalance !== undefined
        ? `${currencySymbol} ${Number(transaction.openingBalance ?? 0).toFixed(2)}`
        : "-"
      const cashAvailableBase = transaction.closingBalance ?? transaction.totalIncome ?? transaction.amount ?? 0
      const cashAvailableDisplay = isClosure
        ? `${currencySymbol} ${Number(cashAvailableBase).toFixed(2)}`
        : "-"

      const documentParts = [
        transaction.clientDocumentType ?? "",
        transaction.clientDocument ?? "",
      ]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)

      const rawNotes = typeof transaction.description === "string" ? transaction.description : ""
      const notesValue = (() => {
        if (!rawNotes) {
          return "-"
        }

        if (isClosure) {
          const sanitized = sanitizeClosureNotes(rawNotes)
          return sanitized.length > 0 ? sanitized : "-"
        }

        const normalized = normalizeWhitespace(rawNotes)
        return normalized.length > 0 ? normalized : "-"
      })()

      return {
        timestamp: formattedDate,
        type: TRANSACTION_TYPE_LABELS[transaction.type] ?? transaction.type ?? "-",
        amount: amountDisplay,
        openingBalance: openingBalanceDisplay,
        cashAvailable: cashAvailableDisplay,
        paymentMethods: paymentMethodsDisplay,
        employee: transaction.employee?.trim() || "-",
        client: transaction.clientName?.trim() || "Sin cliente",
        document: documentParts.length > 0 ? documentParts.join(" ") : "-",
        notes: notesValue,
        voucher: transaction.voucher ?? "-",
      }
    })
  }, [transactions])

  const paymentMethodSummary = useMemo(() => {
    const totals: Record<PaymentSummaryKey, number> = {
      Efectivo: 0,
      Yape: 0,
      Plin: 0,
      Tarjeta: 0,
      Transferencia: 0,
    };

    let resolvedCurrency = "S/.";

    transactions.forEach((transaction) => {
      if (!transaction) {
        return;
      }

      const entryType = transaction.internalType ?? transaction.type;
      if (entryType !== "INCOME" && entryType !== "EXPENSE") {
        return;
      }

      const transactionCurrency =
        typeof transaction.currency === "string" && transaction.currency.trim().length > 0
          ? transaction.currency.trim()
          : resolvedCurrency;

      if (transactionCurrency) {
        resolvedCurrency = transactionCurrency;
      }

      const totalAmount = Number(transaction.amount ?? 0);
      if (!Number.isFinite(totalAmount) || totalAmount === 0) {
        return;
      }

      const signedTotalAmount = resolveSignedAmount(totalAmount, entryType);

      const methods = Array.isArray(transaction.paymentMethods) ? transaction.paymentMethods : [];
      if (methods.length === 0) {
        return;
      }

      const entries: { key: PaymentSummaryKey; amount: number | null }[] = [];

      methods.forEach((rawValue) => {
        const methodKey = identifyPaymentSummaryMethod(rawValue);
        if (!methodKey) {
          return;
        }
        const amountValue = extractAmountFromMethodEntry(rawValue);
        entries.push({ key: methodKey, amount: amountValue });
      });

      if (entries.length === 0) {
        return;
      }

      let assignedAmount = 0;
      const applySignedAmount = (value: number): number => {
        if (!Number.isFinite(value)) {
          return 0;
        }
        if (value === 0) {
          return 0;
        }
        if (value < 0) {
          return value;
        }
        return signedTotalAmount < 0 ? -value : value;
      };

      entries.forEach((entry) => {
        if (entry.amount === null) {
          return;
        }
        const normalizedAmount = applySignedAmount(entry.amount);
        totals[entry.key] += normalizedAmount;
        assignedAmount += normalizedAmount;
      });

      const fallbackEntries = entries.filter((entry) => entry.amount === null);
      const remaining = Number((signedTotalAmount - assignedAmount).toFixed(2));

      if (remaining !== 0 && fallbackEntries.length === 1) {
        totals[fallbackEntries[0].key] += remaining;
      }
    });

    const rows = PAYMENT_SUMMARY_METHODS.map((method) => ({
      method,
      label: PAYMENT_SUMMARY_LABELS[method],
      amount: Number(totals[method].toFixed(2)),
    }));

    const totalAmount = rows.reduce((acc, row) => acc + row.amount, 0);

    return {
      currencySymbol: resolvedCurrency || "S/.",
      rows,
      total: Number(totalAmount.toFixed(2)),
    };
  }, [transactions]);

  const latestClosureTimestamp = useMemo(() => {
    if (closures.length === 0) {
      return null;
    }

    return closures.reduce<Date | null>((latest, closure) => {
      if (!closure || !closure.createdAt) {
        return latest;
      }

      const createdAt = new Date(closure.createdAt);
      if (Number.isNaN(createdAt.getTime()) || !isSameDay(createdAt, selectedDate)) {
        return latest;
      }

      if (!latest || createdAt > latest) {
        return createdAt;
      }

      return latest;
    }, null);
  }, [closures, selectedDate]);

  const transactionsSinceLastClosure = useMemo(() => {
    const sourceTransactions = transactionsForBalance;

    if (!latestClosureTimestamp) {
      return sourceTransactions;
    }

    const closureTime = latestClosureTimestamp.getTime();

    return sourceTransactions.filter((transaction) => {
      const candidate = (() => {
        const { timestamp, createdAt } = transaction as { timestamp?: unknown; createdAt?: unknown };

        if (timestamp instanceof Date) {
          return timestamp;
        }

        if (typeof timestamp === "string" || typeof timestamp === "number") {
          const parsed = new Date(timestamp);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed;
          }
        }

        if (createdAt instanceof Date) {
          return createdAt;
        }

        if (typeof createdAt === "string" || typeof createdAt === "number") {
          const parsed = new Date(createdAt);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed;
          }
        }

        return null;
      })();

      if (!candidate) {
        return true;
      }

      return candidate.getTime() > closureTime;
    });
  }, [transactionsForBalance, latestClosureTimestamp]);

  const cashIncomeTotal = useMemo(() => {
    const baseTransactions = isToday ? transactionsSinceLastClosure : transactions;
    let incomeTotal = 0;
    let expenseTotal = 0;

    baseTransactions.forEach((transaction) => {
      if (!transaction || (transaction.type !== "INCOME" && transaction.type !== "EXPENSE")) {
        return;
      }

      const methods = Array.isArray(transaction.paymentMethods)
        ? transaction.paymentMethods
        : [];
      if (methods.length === 0) {
        return;
      }

      const cashEntries = methods.filter((rawValue) => isCashPaymentMethod(rawValue));
      if (cashEntries.length === 0) {
        return;
      }

      let explicitAmount = 0;
      let hasExplicitAmount = false;
      cashEntries.forEach((rawValue) => {
        const amount = extractAmountFromMethodEntry(rawValue);
        if (amount !== null) {
          explicitAmount += amount;
          hasExplicitAmount = true;
        }
      });

      const resolvedAmount = hasExplicitAmount
        ? explicitAmount
        : cashEntries.length === methods.length
          ? Number(transaction.amount ?? 0)
          : 0;

      if (transaction.type === "INCOME") {
        incomeTotal += resolvedAmount;
      } else if (transaction.type === "EXPENSE") {
        expenseTotal += resolvedAmount;
      }
    });

    const roundedIncome = Number(incomeTotal.toFixed(2));
    const roundedExpense = Number(expenseTotal.toFixed(2));
    const openingBalance = Number(initialBalance ?? 0);
    const expectedCash = openingBalance + roundedIncome - roundedExpense;

    return Number(expectedCash.toFixed(2));
  }, [transactions, transactionsSinceLastClosure, isToday, initialBalance]);

  const openingBalanceForDisplay = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) {
      if (hasCashRegister) {
        return Number(initialBalance ?? 0);
      }

      if (dailyClosureInfo) {
        return Number(dailyClosureInfo.openingBalance ?? 0);
      }

      return null;
    }

    if (dailyClosureInfo) {
      return Number(dailyClosureInfo.openingBalance ?? 0);
    }

    return null;
  }, [selectedDate, hasCashRegister, initialBalance, dailyClosureInfo]);

  const closureFormOpeningBalance = Number(initialBalance ?? 0);

  const isReportEmpty = reportRows.length === 0

  const handleExportExcel = () => {
    if (isReportEmpty) {
      toast.info("No hay movimientos para exportar.")
      return
    }

    const reportDateLabel = format(selectedDate, "dd/MM/yyyy")
    const reportFileDate = format(selectedDate, "yyyy-MM-dd")
    const caption = `Reporte de Caja - ${selectedStoreName} (${reportDateLabel})`
    const sanitizedCaption = escapeHtml(caption)

    const tableHead = REPORT_COLUMNS.map((column) =>
      `<th style="background-color:#f5f5f5;text-align:left;padding:8px;border:1px solid #cccccc;">${escapeHtml(column.header)}</th>`
    ).join("")

    const tableBody = reportRows
      .map((row) => {
        const cells = REPORT_COLUMNS.map((column) => {
          const value = (row[column.key] ?? "-") as string
          return `<td style="padding:6px;border:1px solid #dddddd;vertical-align:top;">${escapeHtml(value)}</td>`
        }).join("")
        return `<tr>${cells}</tr>`
      })
      .join("")

    const tableHtml = `
      <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;min-width:720px;">
        <caption style="margin-bottom:8px;font-weight:bold;">${sanitizedCaption}</caption>
        <thead><tr>${tableHead}</tr></thead>
        <tbody>${tableBody}</tbody>
      </table>
    `.trim()

    const summaryTableRows = paymentMethodSummary.rows
      .map((row) => {
        const amountDisplay = formatSignedCurrency(row.amount, paymentMethodSummary.currencySymbol)
        return `
          <tr>
            <td style="padding:6px;border:1px solid #dddddd;">${escapeHtml(row.label)}</td>
            <td style="padding:6px;border:1px solid #dddddd;text-align:right;">${escapeHtml(amountDisplay)}</td>
          </tr>
        `.trim()
      })
      .join("")

    const summaryTotalDisplay = formatSignedCurrency(
      paymentMethodSummary.total,
      paymentMethodSummary.currencySymbol,
    )
    const summaryTotalRow = `
      <tr>
        <td style="padding:6px;border:1px solid #dddddd;font-weight:bold;">Total</td>
        <td style="padding:6px;border:1px solid #dddddd;text-align:right;font-weight:bold;">${escapeHtml(summaryTotalDisplay)}</td>
      </tr>
    `.trim()

    const summaryTableHtml = `
      <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;min-width:360px;">
        <caption style="margin:16px 0 8px;font-weight:bold;">Resumen por metodo</caption>
        <thead>
          <tr>
            <th style="background-color:#f5f5f5;text-align:left;padding:8px;border:1px solid #cccccc;">Metodo</th>
            <th style="background-color:#f5f5f5;text-align:right;padding:8px;border:1px solid #cccccc;">Total</th>
          </tr>
        </thead>
        <tbody>${summaryTableRows}${summaryTotalRow}</tbody>
      </table>
    `.trim()

    const bodyContent = `${tableHtml}<br/><br/>${summaryTableHtml}`

    const htmlDocument = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${sanitizedCaption}</title>
        </head>
        <body>${bodyContent}</body>
      </html>
    `.trim()

    const blob = new Blob(["\uFEFF", htmlDocument], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    })
    downloadBlob(blob, `reporte-caja-${reportFileDate}.xls`)
    toast.success("Reporte Excel generado correctamente.")
  }

  const handleExportPdf = async () => {
    if (isReportEmpty) {
      toast.info("No hay movimientos para exportar.")
      return
    }

    setIsGeneratingPdf(true)
    try {
      const reportDateLabel = format(selectedDate, "dd/MM/yyyy")
      const reportFileDate = format(selectedDate, "yyyy-MM-dd")
      const pdfStyles = StyleSheet.create({
        page: { padding: 24, fontSize: 10, fontFamily: "Helvetica" },
        header: { marginBottom: 12 },
        title: { fontSize: 18, marginBottom: 4 },
        subtitle: { fontSize: 11, marginBottom: 2 },
        meta: { fontSize: 10, marginBottom: 8 },
        table: { borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 4 },
        tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5", paddingVertical: 4, paddingHorizontal: 4 },
        tableHeaderRow: { backgroundColor: "#f5f5f5", borderBottomWidth: 1, borderBottomColor: "#d4d4d4" },
        tableRowEven: { backgroundColor: "#fafafa" },
        cell: { flex: 1, paddingRight: 6 },
        cellWide: { flex: 2, paddingRight: 6 },
        cellAmount: { textAlign: "right" },
        cellHeader: { fontWeight: "bold" },
        summarySection: { marginTop: 16 },
        summaryTitle: { fontSize: 12, marginTop: 12, marginBottom: 6, fontWeight: "bold" },
        summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
        summaryLabel: { fontSize: 10 },
        summaryAmount: { fontSize: 10, fontWeight: "bold" },
        summaryTotalRow: { marginTop: 6, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: "#d4d4d4", flexDirection: "row", justifyContent: "space-between" },
        summaryTotalLabel: { fontSize: 10, fontWeight: "bold" },
        summaryTotalAmount: { fontSize: 10, fontWeight: "bold" },
      })

      const documentDefinition = (
        <Document>
          <Page size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.header}>
              <Text style={pdfStyles.title}>Reporte de Caja</Text>
              <Text style={pdfStyles.subtitle}>{`Fecha: ${reportDateLabel}`}</Text>
              <Text style={pdfStyles.subtitle}>{`Tienda: ${selectedStoreName}`}</Text>
              <Text style={pdfStyles.meta}>{`Movimientos: ${reportRows.length}`}</Text>
            </View>
            <View style={pdfStyles.table}>
              <View style={[pdfStyles.tableRow, pdfStyles.tableHeaderRow]}>
                {REPORT_COLUMNS.map((column) => {
                  const headerStyles: any[] = [pdfStyles.cell, pdfStyles.cellHeader]
                  if (["timestamp", "paymentMethods", "notes"].includes(column.key)) {
                    headerStyles.push(pdfStyles.cellWide)
                  }
                  if (["amount", "openingBalance", "cashAvailable"].includes(column.key)) {
                    headerStyles.push(pdfStyles.cellAmount);
                  }
                  return (
                    <Text key={column.key} style={headerStyles}>
                      {column.header}
                    </Text>
                  )
                })}
              </View>
              {reportRows.map((row, index) => (
                <View
                  key={`${row.timestamp}-${index}`}
                  style={[
                    [pdfStyles.tableRow, ...(index % 2 === 0 ? [pdfStyles.tableRowEven] : [])] as any
                  ]}
                >
                  {REPORT_COLUMNS.map((column) => {
                    // ⬇⬇⬇ forzamos el tipo del arreglo
                    const cellStyles: any[] = [pdfStyles.cell];
                    if (["timestamp", "paymentMethods", "notes"].includes(column.key)) {
                      cellStyles.push(pdfStyles.cellWide);
                    }
                    if (["amount", "openingBalance", "cashAvailable"].includes(column.key)) {
                      cellStyles.push(pdfStyles.cellAmount); // { textAlign: "right" }
                    }
                    const value = row[column.key] || "-";
                    return (
                      <Text key={column.key} style={cellStyles}>
                        {value}
                      </Text>
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={pdfStyles.summarySection}>
              <Text style={pdfStyles.summaryTitle}>Resumen por metodo</Text>
              {paymentMethodSummary.rows.map((row) => (
                <View key={row.method} style={pdfStyles.summaryRow}>
                  <Text style={pdfStyles.summaryLabel}>{row.label}</Text>
                  <Text style={pdfStyles.summaryAmount}>
                    {formatSignedCurrency(row.amount, paymentMethodSummary.currencySymbol)}
                  </Text>
                </View>
              ))}
              <View style={pdfStyles.summaryTotalRow}>
                <Text style={pdfStyles.summaryTotalLabel}>Total</Text>
                <Text style={pdfStyles.summaryTotalAmount}>
                  {formatSignedCurrency(paymentMethodSummary.total, paymentMethodSummary.currencySymbol)}
                </Text>
              </View>
            </View>
          </Page>
        </Document>
      )
      const blob = await pdf(documentDefinition).toBlob()
      downloadBlob(blob, `reporte-caja-${reportFileDate}.pdf`)
      toast.success("Reporte PDF generado correctamente.")
    } catch (error) {
      console.error("Error generando PDF de caja:", error)
      toast.error("No se pudo generar el PDF. Inténtalo de nuevo.")
    } finally {
      setIsGeneratingPdf(false)
    }
  }
  // -------------------- FUNCIONES --------------------
  // Nueva función para recargar balance y transacciones
  const refreshCashData = async () => {
    if (storeId === null) return;

    try {
      const [activeRegister, newTransactions, closuresResponse] = await Promise.all([
        getActiveCashRegister(storeId),
        getTodayTransactions(storeId),
        getClosuresByStore(storeId),
      ]);

      if (activeRegister) {
        setActiveCashRegisterId(activeRegister.id);
        setBalance(Number(activeRegister.currentBalance));
        setInitialBalance(Number(activeRegister.initialBalance));
        setHasCashRegister(true);
      } else {
        setActiveCashRegisterId(null);
        setBalance(0);
        setInitialBalance(0);
        setHasCashRegister(false);
      }

      const safeTransactions = Array.isArray(newTransactions) ? newTransactions : [];
      const validTransactions = safeTransactions.map((transaction: any) => adaptTransaction(transaction));
      const mergedTransactions = mergeSaleTransactions(validTransactions);

      const sortedClosuresRaw = Array.isArray(closuresResponse)
        ? sortClosuresByDateDesc(closuresResponse)
        : [];
      const { amount: latestClosureOverride, transactionId: latestClosureTransactionId } =
        resolveLatestClosureOverride(activeRegister, sortedClosuresRaw);
      const closuresWithOverride = withLatestClosureOverride(sortedClosuresRaw, latestClosureOverride);

      const transactionsWithOverride = withClosureTransactionOverride(
        mergedTransactions,
        latestClosureOverride,
        latestClosureTransactionId,
      );

      const income = transactionsWithOverride
        .filter((t: any) => t.internalType === "INCOME")
        .reduce((sum: any, t: any) => sum + t.amount, 0);

      const expense = transactionsWithOverride
        .filter((t: any) => t.internalType === "EXPENSE")
        .reduce((sum: any, t: any) => sum + t.amount, 0);

      setTransactions(transactionsWithOverride);
      setTotalIncome(income);
      setTotalExpense(expense);

      setClosures(closuresWithOverride);

      console.log("✅ Recalculado totalIncome:", income);
      console.log("✅ Recalculado totalExpense:", expense);

    } catch (error) {
      console.error("Error actualizando datos de caja:", error);
    }
  };

  const reinitializeCashRegister = async (): Promise<string | null> => {
    if (!storeId) return null;
  
    try {
      const res = await getActiveCashRegister(storeId);
      const userData = await getUserDataFromToken();
  
      if (res) {
        setActiveCashRegisterId(res.id);
        setBalance(Number(res.currentBalance));
        setInitialBalance(Number(res.initialBalance));
        setHasCashRegister(true);
      } else {
        setActiveCashRegisterId(null);
        setBalance(0);
        setInitialBalance(0);
        setHasCashRegister(false);
      }
  
      return userData?.name ?? null; // 👈 garantizamos que es string o null
    } catch (error) {
      console.error("Error al reiniciar caja:", error);
      setActiveCashRegisterId(null);
      setBalance(0);
      setInitialBalance(0);
      setHasCashRegister(false);
      return null;
    }
  };

  const handleRequestOpenCashRegister = () => {
    if (!storeId) return;

    const lastClosureAmount =
      closures.length > 0 ? Number(closures[0].closingBalance || 0) : 0;
    setInitialAmountToOpen(lastClosureAmount); // pre-fill with last closure or 0
    setShowOpenCashDialog(true); // abre el diálogo
  };

  useEffect(() => {
    if (!selectedDate || !Array.isArray(closures) || closures.length === 0) {
      setDailyClosureInfo(null);
      return;
    }

    const closureOfDay = closures.reduce((latest: any | null, closure: any) => {
      if (!closure || !closure.createdAt) {
        return latest;
      }

      const createdAt = new Date(closure.createdAt);
      if (!isSameDay(createdAt, selectedDate)) {
        return latest;
      }

      if (!latest || !latest.createdAt) {
        return closure;
      }

      const latestDate = new Date(latest.createdAt);
      return createdAt > latestDate ? closure : latest;
    }, null);

    if (!closureOfDay) {
      setDailyClosureInfo(null);
      return;
    }

    setDailyClosureInfo({
      openingBalance: Number(closureOfDay.openingBalance ?? 0),
      closingBalance: Number(closureOfDay.closingBalance ?? 0),
    });
  }, [closures, selectedDate]);

   // -------------------- USE EFFECTS --------------------

  useEffect(() => {
    async function fetchStores() {
      try {
        const data = await getStores();
        const sortedStores = data.sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name)
        );
        setStores(sortedStores);
    
        if (sortedStores.length > 0) {
          setStoreId(sortedStores[0].id);
        }
      } catch (error) {
        console.error("Error al obtener las tiendas:", error);
      }
    }
  
    fetchStores();
  }, []);

  // Obtener el balance de la caja activa al cambiar la tienda seleccionada
  useEffect(() => {
    if (storeId === null) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [activeRegister, closuresData] = await Promise.all([
          getActiveCashRegister(storeId).catch(() => null),
          getClosuresByStore(storeId).catch((err) => {
            console.error("Error al obtener cierres:", err);
            return [] as any[];
          }),
        ]);

        if (cancelled) {
          return;
        }

        if (activeRegister) {
          setActiveCashRegisterId(activeRegister.id);
          setBalance(Number(activeRegister.currentBalance));
          setInitialBalance(Number(activeRegister.initialBalance));
          setHasCashRegister(true);
        } else {
          setActiveCashRegisterId(null);
          setBalance(0);
          setInitialBalance(0);
          setHasCashRegister(false);
        }

        const sortedClosures = Array.isArray(closuresData)
          ? sortClosuresByDateDesc(closuresData)
          : [];
        const { amount: latestClosureOverride } = resolveLatestClosureOverride(
          activeRegister,
          sortedClosures,
        );
        const closuresWithOverride = withLatestClosureOverride(sortedClosures, latestClosureOverride);

        setClosures(closuresWithOverride);
      } catch (error) {
        if (!cancelled) {
          console.error("Error al obtener datos de caja:", error);
          setActiveCashRegisterId(null);
          setBalance(0);
          setInitialBalance(0);
          setHasCashRegister(false);
          setClosures([]);
        }
      }

      try {
        const currentBalance = await getCashRegisterBalance(storeId);
        if (cancelled) {
          return;
        }

        if (currentBalance === null) {
          setBalance(0);
          setHasCashRegister(false);
        } else {
          setBalance(Number(currentBalance));
          setHasCashRegister(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error real al obtener el balance:", error);
          setBalance(0);
          setHasCashRegister(false);
        }
      }
    };  
    loadData();

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
  if (storeId === null || !selectedDate) return;

  let cancelled = false;
    setIsFetchingTransactions(true);

  const load = async (): Promise<void> => {
    try {
      const datesToFetch = new Set<string>();

        const collectDateStrings = (date: Date) => {
          const baseString = ymdLocal(date);
          datesToFetch.add(baseString);

          const timezoneOffsetMinutes = date.getTimezoneOffset();
          if (timezoneOffsetMinutes > 0) {
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            datesToFetch.add(ymdLocal(nextDate));
          } else if (timezoneOffsetMinutes < 0) {
            const prevDate = new Date(date);
            prevDate.setDate(prevDate.getDate() - 1);
            datesToFetch.add(ymdLocal(prevDate));
          }
        }; 

        collectDateStrings(selectedDate);

        if (isToday && latestClosureTimestamp) {
          const startDate = new Date(latestClosureTimestamp);
          startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
          endDate.setHours(0, 0, 0, 0);

          if (startDate <= endDate) {
            for (
              let cursor = new Date(startDate);
              cursor <= endDate;
              cursor.setDate(cursor.getDate() + 1)
            ) {
              collectDateStrings(cursor);
            }
          }
        }

        const fetchDates = Array.from(datesToFetch);
        const responses = await Promise.all(
          fetchDates.map(async (dateString) => {
            try {
              const data = await getTransactionsByDate(storeId, dateString);
              return Array.isArray(data) ? data : [];
            } catch (error) {
              console.error(`Error al obtener transacciones para la fecha ${dateString}:`, error);
              return [];
            }
          }),
        );

        if (cancelled) return;

        const flattenedTransactions = responses.flat();
        const transactionsById = new Map<string, any>();

        flattenedTransactions.forEach((transaction) => {
          if (!transaction) return;

        const transactionId = String(transaction.id);
          if (!transactionsById.has(transactionId)) {
            transactionsById.set(transactionId, transaction);
          }
        });

        const adaptedTransactions = Array.from(transactionsById.values()).map((t: any) =>
          adaptTransaction(t),
        );

        const merged = mergeSaleTransactions(adaptedTransactions);

        if (!cancelled) {
          setTransactionsForBalance(merged);

          const filteredBySelectedDate = merged.filter((transaction) =>
            isSameDay(transaction.timestamp, selectedDate),
          );

          setTransactions(filteredBySelectedDate);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error al obtener transacciones por fecha:", error);
          setTransactions([]);
          setTransactionsForBalance([]);
        }
      } finally {
        if (!cancelled) setIsFetchingTransactions(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId, selectedDate, isToday, latestClosureTimestamp]);


  useEffect(() => {
    // Solo considera transacciones válidas (evita CLOSURE)
    const financialTransactions = transactions.filter(
      (t) => t.internalType === "INCOME" || t.internalType === "EXPENSE"
    );
  
    const income = financialTransactions
      .filter((t) => t.internalType === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
  
    const expense = financialTransactions
      .filter((t) => t.internalType === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
  
    setTotalIncome(income);
    setTotalExpense(expense);
  
    console.log("✅ Ingresos calculados:", income);
    console.log("✅ Egresos calculados:", expense);
  }, [transactions]);

  useEffect(() => {
    if (storeId !== null) {
      getActiveCashRegister(storeId)
        .then((res) => {
          if (res) {
            setActiveCashRegisterId(res.id);
          } else {
            setActiveCashRegisterId(null);
          }
        })
        .catch(() => setActiveCashRegisterId(null));
    }
  }, [storeId]);

  const financialTransactions = transactions.filter(
    (t) => t.internalType === "INCOME" || t.internalType === "EXPENSE"
  );

  // Mostrar loader mientras se revisa sesión
  if (checkingSession) {
    return <div className="p-8 text-center">Verificando sesión...</div>;
  }

  // -------------------- UI --------------------

  return (
    <div className="grid gap-6">

      {/* Selector de tienda */}
      <div>
        <label htmlFor="store-select" className="block text-sm font-medium mb-1">
          Seleccionar Tienda
        </label>
        <Select
          value={storeId !== null ? String(storeId) : ""}
          onValueChange={(value:any) => setStoreId(Number(value))}
        >
          <SelectTrigger id="store-select" className="w-full">
            <SelectValue placeholder="Seleccione una tienda" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hasCashRegister && storeId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Caja Cerrada</CardTitle>
              <CardDescription>No hay una caja activa para esta tienda.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleRequestOpenCashRegister} 
                size="sm" 
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Abrir Nueva Caja
              </Button>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrir nueva caja</AlertDialogTitle>
              <AlertDialogDescription>
                El saldo inicial sugerido es el del último cierre: 
                <strong className="text-green-600"> S/. {initialAmountToOpen.toFixed(2)}</strong>.
                Puedes modificarlo si es necesario.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Saldo Inicial</label>
              <Input
                type="number"
                value={initialAmountToOpen}
                onChange={(e) => setInitialAmountToOpen(Number(e.target.value))}
                step="0.01"
                min="0"
              />
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    const newName = `Caja Principal - Tienda ${storeId} - ${Date.now()}`;
                    await createCashRegister({
                      storeId,
                      initialBalance: initialAmountToOpen,
                      name: newName,
                    });
                    toast.success("Caja creada exitosamente");
                    await refreshCashData();
                  } catch (error: any) {
                    console.error("Error al abrir nueva caja:", error);
                    toast.error("No se pudo crear la caja.");
                  } finally {
                    setShowOpenCashDialog(false);
                  }
                }}
              >
                Confirmar Apertura
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {isSameDay(selectedDate, new Date()) ? "Saldo Actual" : `Saldo del ${format(selectedDate, "dd/MM/yyyy")}`}
            </CardTitle>
            <CardDescription>
              {isSameDay(selectedDate, new Date()) ? "Dinero de todas las operaciones en caja hoy" : "Dinero de todas las operaciones en caja segun ultimo cierre de ese dia"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isSameDay(selectedDate, new Date()) && hasCashRegister && !isNaN(Number(balance)) ? (
                `S/.${Number(balance).toFixed(2)}`
              ) : dailyClosureInfo ? (
                `S/.${Number(dailyClosureInfo.closingBalance).toFixed(2)}`
              ) : (
                "Sin cierre ese día"
              )}
            </div>
            {isSameDay(selectedDate, new Date()) && (
              <div className="text-sm text-muted-foreground mt-2">
                Dinero en efectivo disponible hoy: {`${paymentMethodSummary.currencySymbol} ${cashIncomeTotal.toFixed(2)}`}
              </div>
            )}
            {openingBalanceForDisplay !== null && (
              <div className="text-sm text-muted-foreground mt-1">
                Saldo inicial(En Efectivo): S/. {Number(openingBalanceForDisplay).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
          <CardTitle>
            {isToday
              ? "Transacciones del día de hoy"
              : `Transacciones del día ${selectedDate.toLocaleDateString("es-PE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}`}
          </CardTitle>
            <CardDescription>Numero de movimientos en caja</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {financialTransactions.length > 0 ? financialTransactions.length : '0'} {/* Mostrar el número total de transacciones */}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Último Cierre</CardTitle>
            <CardDescription>Historial de cierres de caja</CardDescription>
          </CardHeader>
          <CardContent>
            {closures.length > 0 ? (
              <>
                <div className="text-lg font-semibold">
                  {new Date(closures[0].createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Monto de cierre:{" "}
                  <span className="font-medium">
                    S/. {Number(closures[0]?.closingBalance ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total de cierres: {closures.length}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                No hay cierres registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transfer">
            <span className="block sm:hidden">Transferencias</span>
            <span className="hidden sm:block">Transferencia de Dinero</span>
          </TabsTrigger>
          <TabsTrigger value="closure">
            <span className="block sm:hidden">Cierres</span>
            <span className="hidden sm:block">Cierre de Efectivo</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <span className="block sm:hidden">Historial</span>
            <span className="hidden sm:block">Historial de Transacciones</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transferencia de Dinero</CardTitle>
              <CardDescription>Registrar depositos y retiros de la caja registradora</CardDescription>
            </CardHeader>
            <CardContent>
            {storeId !== null && userId !== null && activeCashRegisterId !== null && (
              <CashTransferForm
                currentBalance={balance}
                storeId={storeId}
                refreshData={refreshCashData} // 👈 nuevo
              />
            )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="closure">
          <Card>
            <CardHeader>
              <CardTitle>Cierre de Efectivo</CardTitle>
              <CardDescription>
              Registrar depósitos y retiros de la caja registradora</CardDescription>
            </CardHeader>
            <CardContent>
            {storeId !== null && userId !== null && activeCashRegisterId !== null && (
              <CashClosureForm
                storeId={storeId!}
                cashRegisterId={activeCashRegisterId} // 👈 id de la tienda/caja (nunca será null porque ya haces validación arriba)
                userId={userId} // 👈 tienes que obtener el userId del localStorage o sesión
                currentBalance={balance}
                openingBalance={closureFormOpeningBalance} // 👈 tienes que calcularlo
                totalIncome={totalIncome} // 👈 tienes que calcularlo
                totalExpense={totalExpense} // 👈 tienes que calcularlo
                onClosureCompleted={refreshCashData}
                reinitializeCashRegister={reinitializeCashRegister}
                currencySymbol={paymentMethodSummary.currencySymbol}
                cashIncomeTotal={cashIncomeTotal}
              />
            )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-1">
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>Ver todas las transacciones de la caja registradora</CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleExportExcel}
                  disabled={isReportEmpty}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={handleExportPdf}
                  disabled={isReportEmpty || isGeneratingPdf}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isGeneratingPdf ? "Generando PDF..." : "Exportar PDF"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionHistory 
                transactions={transactions} 
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                // 👇 estos dos props solo si estás usando la versión antiflicker del hijo
                isFetching={isFetchingTransactions}
                keepPrevious
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}