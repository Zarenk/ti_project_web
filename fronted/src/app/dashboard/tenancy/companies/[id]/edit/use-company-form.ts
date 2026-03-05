"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type {
  CompanyDetail,
  SunatEnvironment,
  UpdateCompanyPayload,
} from "../../../tenancy.api";
import { updateCompany } from "../../../tenancy.api";


// ── Constants ────────────────────────────────────────────────
export const MAX_NAME_LENGTH = 200;
export const RUC_MAX_LENGTH = 11;
const NAME_FIELDS = ["name", "legalName", "sunatBusinessName"] as const;
export const LOGO_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
export const DEFAULT_PRIMARY_COLOR = "#0B2B66";
export const DEFAULT_SECONDARY_COLOR = "#0F3B8C";
export const DOCUMENT_SEQUENCE_TYPES = [
  {
    documentType: "FACTURA",
    label: "Facturas",
    defaultSerie: "F001",
    defaultCorrelative: "001",
    requiredPrefix: "F",
  },
  {
    documentType: "BOLETA",
    label: "Boletas",
    defaultSerie: "B001",
    defaultCorrelative: "001",
    requiredPrefix: "B",
  },
  {
    documentType: "NC_FACTURA",
    label: "NC Facturas",
    defaultSerie: "FC01",
    defaultCorrelative: "001",
    requiredPrefix: "F",
  },
  {
    documentType: "NC_BOLETA",
    label: "NC Boletas",
    defaultSerie: "BC01",
    defaultCorrelative: "001",
    requiredPrefix: "B",
  },
  {
    documentType: "GUIA",
    label: "Guía de Remisión",
    defaultSerie: "T001",
    defaultCorrelative: "00000001",
    requiredPrefix: "T",
  },
] as const;

type NameField = (typeof NAME_FIELDS)[number];
export type FieldErrors = Partial<Record<keyof UpdateCompanyPayload, string | null>>;
export type SequenceState = Record<string, { serie: string; nextCorrelative: string }>;

// ── Validation ───────────────────────────────────────────────
export const validateCompanyForm = (
  state: UpdateCompanyPayload,
  sequences?: SequenceState | null,
): FieldErrors => {
  const errors: FieldErrors = {};

  NAME_FIELDS.forEach((field) => {
    const raw = state[field] ?? "";
    const trimmed = raw.trim();
    if (trimmed.length > MAX_NAME_LENGTH) {
      errors[field] = `Máximo ${MAX_NAME_LENGTH} caracteres.`;
    }
  });

  const validateRuc = (value: string | null | undefined, field: "taxId" | "sunatRuc") => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) {
      errors[field] = "El RUC es obligatorio.";
      return;
    }
    if (!/^\d{11}$/.test(trimmed)) {
      errors[field] = "El RUC debe tener 11 dígitos numéricos.";
    }
  };

  validateRuc(state.taxId, "taxId");
  validateRuc(state.sunatRuc, "sunatRuc");

  const validateColor = (rawValue: string | null | undefined, field: "primaryColor" | "secondaryColor") => {
    if (rawValue == null || rawValue.trim().length === 0) return;
    const normalized = rawValue.trim().startsWith("#") ? rawValue.trim() : `#${rawValue.trim()}`;
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
      errors[field] = "Usa un color HEX válido (ej. #123ABC).";
    }
  };

  validateColor(state.primaryColor ?? null, "primaryColor");
  validateColor(state.secondaryColor ?? null, "secondaryColor");

  // Validar credenciales de producción cuando se selecciona PROD
  if (state.sunatEnvironment === "PROD") {
    if (!state.sunatSolUserProd?.trim()) {
      errors.sunatSolUserProd = "Usuario SOL de producción es requerido para modo PROD.";
    }
    if (!state.sunatSolPasswordProd?.trim()) {
      errors.sunatSolPasswordProd = "Clave SOL de producción es requerida para modo PROD.";
    }
  }

  if (sequences) {
    for (const { documentType, label, requiredPrefix } of DOCUMENT_SEQUENCE_TYPES) {
      const current = sequences[documentType];
      const serie = current?.serie?.trim() ?? "";
      const correlativo = current?.nextCorrelative?.trim() ?? "";

      if (!serie || !correlativo) {
        errors.documentSequences = `Completa la serie y el numero inicial para ${label}.`;
        break;
      }
      if (!/^[A-Z0-9-]+$/.test(serie)) {
        errors.documentSequences = `La serie de ${label} solo admite letras, numeros o guiones.`;
        break;
      }
      if (serie.length < 4) {
        errors.documentSequences = `La serie de ${label} debe tener al menos 4 caracteres (ej: ${requiredPrefix ?? "F"}001).`;
        break;
      }
      if (requiredPrefix && !serie.startsWith(requiredPrefix)) {
        errors.documentSequences = `La serie de ${label} debe iniciar con "${requiredPrefix}" (ej: ${requiredPrefix}001). SUNAT rechazará series que no cumplan este formato.`;
        break;
      }
      if (!/^\d+$/.test(correlativo)) {
        errors.documentSequences = `El numero inicial de ${label} debe contener solo digitos.`;
        break;
      }
    }
  }

  return errors;
};

export const getErrorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

// ── Tab-error mapping ────────────────────────────────────────
const GENERAL_FIELDS: (keyof UpdateCompanyPayload)[] = ["name", "legalName", "taxId"];
const RECEIPTS_FIELDS: (keyof UpdateCompanyPayload)[] = ["documentSequences", "primaryColor", "secondaryColor"];
const SUNAT_FIELDS: (keyof UpdateCompanyPayload)[] = ["sunatRuc", "sunatBusinessName", "sunatSolUserProd", "sunatSolPasswordProd"];

export type CompanyTab = "general" | "receipts" | "sunat" | "history";

/** Returns which tabs have at least one validation error */
export function getTabsWithErrors(errors: FieldErrors): Set<CompanyTab> {
  const tabs = new Set<CompanyTab>();
  for (const field of GENERAL_FIELDS) {
    if (errors[field]) tabs.add("general");
  }
  for (const field of RECEIPTS_FIELDS) {
    if (errors[field]) tabs.add("receipts");
  }
  for (const field of SUNAT_FIELDS) {
    if (errors[field]) tabs.add("sunat");
  }
  return tabs;
}

/** Returns the first tab with an error, for auto-switching on submit */
export function getFirstErrorTab(errors: FieldErrors): CompanyTab | null {
  for (const field of GENERAL_FIELDS) {
    if (errors[field]) return "general";
  }
  for (const field of RECEIPTS_FIELDS) {
    if (errors[field]) return "receipts";
  }
  for (const field of SUNAT_FIELDS) {
    if (errors[field]) return "sunat";
  }
  return null;
}

const sanitize = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

// ── Hook ─────────────────────────────────────────────────────
export function useCompanyForm(company: CompanyDetail) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const createInitialFormState = (): UpdateCompanyPayload => ({
    name: company.name,
    legalName: company.legalName ?? "",
    taxId: company.taxId ?? "",
    status: company.status ?? "ACTIVE",
    sunatEnvironment: (company.sunatEnvironment ?? "BETA") as SunatEnvironment,
    sunatRuc: company.sunatRuc ?? "",
    sunatBusinessName: company.sunatBusinessName ?? "",
    sunatAddress: company.sunatAddress ?? "",
    sunatPhone: company.sunatPhone ?? "",
    sunatContactEmail: company.sunatContactEmail ?? "",
    logoUrl: company.logoUrl ?? "",
    primaryColor: company.primaryColor ?? "",
    secondaryColor: company.secondaryColor ?? "",
    sunatSolUserBeta: company.sunatSolUserBeta ?? "",
    sunatSolPasswordBeta: company.sunatSolPasswordBeta ?? "",
    sunatSolUserProd: company.sunatSolUserProd ?? "",
    sunatSolPasswordProd: company.sunatSolPasswordProd ?? "",
    whatsappAutoSendInvoice: (company as Record<string, unknown>).whatsappAutoSendInvoice === true,
  });

  const createInitialSequenceState = (): SequenceState => {
    const lookup = new Map(
      (company.documentSequences ?? []).map((seq) => [
        (seq.documentType ?? "").toUpperCase(),
        seq,
      ]),
    );
    const initial: SequenceState = {};
    for (const config of DOCUMENT_SEQUENCE_TYPES) {
      const stored = lookup.get(config.documentType);
      const padding =
        stored?.correlativeLength ??
        (stored?.nextCorrelative
          ? String(stored.nextCorrelative).length
          : config.defaultCorrelative.length);
      const formatted =
        stored && typeof stored.nextCorrelative === "number"
          ? String(stored.nextCorrelative).padStart(padding, "0")
          : config.defaultCorrelative;
      initial[config.documentType] = {
        serie: stored?.serie ?? config.defaultSerie,
        nextCorrelative: formatted,
      };
    }
    return initial;
  };

  const [formState, setFormState] = useState<UpdateCompanyPayload>(createInitialFormState);
  const [sequenceState, setSequenceState] = useState<SequenceState>(createInitialSequenceState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(() =>
    validateCompanyForm(createInitialFormState(), createInitialSequenceState()),
  );

  const updateFormState = useCallback(
    (updater: (prev: UpdateCompanyPayload) => UpdateCompanyPayload) => {
      setFormState((prev) => {
        const next = updater(prev);
        setFieldErrors(validateCompanyForm(next, sequenceState));
        return next;
      });
    },
    [sequenceState],
  );

  const updateSequenceField = useCallback(
    (documentType: string, field: keyof SequenceState[string], value: string) => {
      setSequenceState((prev) => {
        const current = prev[documentType] ?? { serie: "", nextCorrelative: "" };
        const next = { ...prev, [documentType]: { ...current, [field]: value } };
        setFieldErrors(validateCompanyForm(formState, next));
        return next;
      });
    },
    [formState],
  );

  // ── Change handlers ────────────────────────────────────────
  const handleBasicChange =
    (field: keyof UpdateCompanyPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
      updateFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleLimitedTextChange =
    (field: NameField) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const limited = event.target.value.slice(0, MAX_NAME_LENGTH);
      updateFormState((prev) => ({ ...prev, [field]: limited }));
    };

  const handleRucChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, RUC_MAX_LENGTH);
    updateFormState((prev) => ({ ...prev, taxId: digits, sunatRuc: digits }));
  };

  const handleSequenceSerieChange =
    (documentType: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8);
      updateSequenceField(documentType, "serie", sanitized);
    };

  const handleSequenceCorrelativeChange =
    (documentType: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
      updateSequenceField(documentType, "nextCorrelative", digits);
    };

  const handleColorPickerChange =
    (field: "primaryColor" | "secondaryColor") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleColorTextChange =
    (field: "primaryColor" | "secondaryColor") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleClearColor = (field: "primaryColor" | "secondaryColor") => () => {
    updateFormState((prev) => ({ ...prev, [field]: null }));
  };

  const handleEnvironmentChange = (value: SunatEnvironment) => {
    updateFormState((prev) => ({ ...prev, sunatEnvironment: value }));
  };

  const inputValidationClass = (field: keyof UpdateCompanyPayload) =>
    fieldErrors[field] ? "border-destructive focus-visible:ring-destructive" : undefined;

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateCompanyForm(formState, sequenceState);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast.error("Corrige los campos marcados antes de guardar.");
      return;
    }

    const sequencePayload = DOCUMENT_SEQUENCE_TYPES.map(({ documentType }) => {
      const current = sequenceState[documentType];
      const serie = current?.serie?.trim() ?? "";
      const nextCorrelative = current?.nextCorrelative?.trim() ?? "";
      return {
        documentType,
        serie,
        nextCorrelative,
        correlativeLength: nextCorrelative.length || undefined,
      };
    }).filter((e) => e.serie && e.nextCorrelative);

    startTransition(async () => {
      try {
        const environmentValue = (formState.sunatEnvironment ?? "BETA") as SunatEnvironment;
        await updateCompany(company.id, {
          name: formState.name,
          status: formState.status,
          sunatEnvironment: environmentValue,
          legalName: sanitize(formState.legalName),
          taxId: sanitize(formState.taxId),
          sunatRuc: sanitize(formState.sunatRuc),
          sunatBusinessName: sanitize(formState.sunatBusinessName),
          sunatAddress: sanitize(formState.sunatAddress),
          sunatPhone: sanitize(formState.sunatPhone),
          sunatContactEmail: sanitize(formState.sunatContactEmail),
          logoUrl: sanitize(formState.logoUrl),
          primaryColor: sanitize(formState.primaryColor),
          secondaryColor: sanitize(formState.secondaryColor),
          sunatSolUserBeta: sanitize(formState.sunatSolUserBeta),
          sunatSolPasswordBeta: sanitize(formState.sunatSolPasswordBeta),
          sunatSolUserProd: sanitize(formState.sunatSolUserProd),
          sunatSolPasswordProd: sanitize(formState.sunatSolPasswordProd),
          whatsappAutoSendInvoice: formState.whatsappAutoSendInvoice ?? false,
          documentSequences: sequencePayload,
        });
        toast.success("Empresa actualizada correctamente.");
        router.refresh();
      } catch (error: unknown) {
        const msg = getErrorMessage(error);
        toast.error(msg ?? "No se pudo actualizar la empresa. Inténtalo nuevamente.");
      }
    });
  };

  return {
    formState,
    setFormState,
    sequenceState,
    fieldErrors,
    isPending,
    handleBasicChange,
    handleLimitedTextChange,
    handleRucChange,
    handleSequenceSerieChange,
    handleSequenceCorrelativeChange,
    handleColorPickerChange,
    handleColorTextChange,
    handleClearColor,
    handleEnvironmentChange,
    inputValidationClass,
    handleSubmit,
    updateFormState,
  };
}