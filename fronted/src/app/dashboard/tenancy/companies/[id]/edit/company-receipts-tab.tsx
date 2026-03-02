"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { UpdateCompanyPayload } from "../../../tenancy.api";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DOCUMENT_SEQUENCE_TYPES,
  type FieldErrors,
  type SequenceState,
} from "./use-company-form";

interface CompanyReceiptsTabProps {
  formState: UpdateCompanyPayload;
  sequenceState: SequenceState;
  fieldErrors: FieldErrors;
  isPending: boolean;
  sunatEnvironment?: string;
  handleSequenceSerieChange: (docType: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSequenceCorrelativeChange: (docType: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleColorPickerChange: (field: "primaryColor" | "secondaryColor") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleColorTextChange: (field: "primaryColor" | "secondaryColor") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClearColor: (field: "primaryColor" | "secondaryColor") => () => void;
  inputValidationClass: (field: keyof UpdateCompanyPayload) => string | undefined;
}

export function CompanyReceiptsTab({
  formState,
  sequenceState,
  fieldErrors,
  isPending,
  sunatEnvironment,
  handleSequenceSerieChange,
  handleSequenceCorrelativeChange,
  handleColorPickerChange,
  handleColorTextChange,
  handleClearColor,
  inputValidationClass,
}: CompanyReceiptsTabProps) {
  return (
    <div className="space-y-8">
      {sunatEnvironment === "PROD" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950/20 dark:border-blue-800 animate-in fade-in duration-300">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Estas en modo produccion. Si empiezas desde cero, las series deben iniciar en 001.
            Si ya emitiste comprobantes, ingresa el siguiente numero disponible.
          </p>
        </div>
      )}

      {/* ── Series y correlativos ─────────────────────────── */}
      <section className="space-y-4">
        <div className="space-y-1">
          <Label className="text-base font-medium text-slate-900 dark:text-slate-100">
            Series y correlativos iniciales
          </Label>
          <p className="text-xs text-muted-foreground">
            Ajusta la serie y el numero inicial para cada tipo de comprobante. El sistema continuara con el siguiente
            correlativo automaticamente.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {DOCUMENT_SEQUENCE_TYPES.map(({ documentType, label, defaultSerie, defaultCorrelative }) => {
            const current = sequenceState[documentType] ?? { serie: "", nextCorrelative: "" };
            return (
              <div
                key={documentType}
                className="rounded-lg border border-slate-200 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800"
              >
                <div className="flex items-center justify-between text-sm font-medium text-slate-900 dark:text-slate-100">
                  <span>{label}</span>
                  <span className="text-xs text-muted-foreground">{documentType}</span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`sequence-${documentType}-serie`}>Serie</Label>
                    <Input
                      id={`sequence-${documentType}-serie`}
                      value={current.serie}
                      onChange={handleSequenceSerieChange(documentType)}
                      placeholder={defaultSerie}
                      maxLength={8}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`sequence-${documentType}-correlative`}>Numero inicial</Label>
                    <Input
                      id={`sequence-${documentType}-correlative`}
                      value={current.nextCorrelative}
                      onChange={handleSequenceCorrelativeChange(documentType)}
                      placeholder={defaultCorrelative}
                      inputMode="numeric"
                      disabled={isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      El siguiente comprobante se emitira con este numero y luego se incrementara.
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {fieldErrors.documentSequences ? (
          <p className="text-xs text-destructive">{fieldErrors.documentSequences}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ejemplo: si tu ultimo numero fue 025, ingresa 026 para continuar desde ahi.
          </p>
        )}
      </section>

      {/* ── Colores del comprobante ───────────────────────── */}
      <section className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-base font-medium text-slate-900 dark:text-slate-100">
            Colores del comprobante
          </Label>
          <p className="text-xs text-muted-foreground">
            Personaliza los colores de las bandas y encabezados del comprobante electrónico.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(["primaryColor", "secondaryColor"] as const).map((field) => {
            const label = field === "primaryColor" ? "Color primario" : "Color secundario";
            const placeholder = field === "primaryColor" ? "#0B2B66" : "#0F3B8C";
            const defaultColor = field === "primaryColor" ? DEFAULT_PRIMARY_COLOR : DEFAULT_SECONDARY_COLOR;
            const value = formState[field];

            return (
              <div key={field} className="space-y-2">
                <Label htmlFor={`color-${field}`}>{label}</Label>
                <div className="flex items-center gap-3">
                  <input
                    id={`color-${field}`}
                    type="color"
                    className="h-10 w-10 cursor-pointer rounded border border-input transition-transform hover:scale-105"
                    value={value && /^#[0-9A-Fa-f]+$/.test(value) ? value : defaultColor}
                    onChange={handleColorPickerChange(field)}
                    disabled={isPending}
                  />
                  <Input
                    value={value ?? ""}
                    onChange={handleColorTextChange(field)}
                    placeholder={placeholder}
                    disabled={isPending}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={handleClearColor(field)}
                    disabled={isPending}
                  >
                    Restablecer
                  </Button>
                </div>
                {fieldErrors[field] && (
                  <p className="text-xs text-destructive">{fieldErrors[field]}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Preview ─────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Vista previa de colores</p>
          <div className="flex gap-3">
            <div
              className="h-10 flex-1 rounded transition-colors"
              style={{
                backgroundColor:
                  (formState.primaryColor && /^#[0-9A-Fa-f]+$/.test(formState.primaryColor))
                    ? formState.primaryColor
                    : DEFAULT_PRIMARY_COLOR,
              }}
            />
            <div
              className="h-10 flex-1 rounded transition-colors"
              style={{
                backgroundColor:
                  (formState.secondaryColor && /^#[0-9A-Fa-f]+$/.test(formState.secondaryColor))
                    ? formState.secondaryColor
                    : DEFAULT_SECONDARY_COLOR,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Banda superior (primario) · Encabezado (secundario)
          </p>
        </div>
      </section>
    </div>
  );
}