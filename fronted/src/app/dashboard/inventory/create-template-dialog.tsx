"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { authFetch } from "@/utils/auth-fetch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getProviders } from "@/app/dashboard/providers/providers.api"

import { BACKEND_URL } from "@/lib/utils"

interface CreateTemplateDialogProps {
  organizationId?: number | null;
  companyId?: number | null;
  sampleId?: number | null;
  onCreated?: () => void;
}

export function CreateTemplateDialog({
  organizationId,
  companyId,
  sampleId,
  onCreated,
}: CreateTemplateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [documentType, setDocumentType] = useState("FACTURA_ELECTRONICA")
  const [providerId, setProviderId] = useState<number | undefined>(undefined);
  const [version, setVersion] = useState("1");
  const [priority, setPriority] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const defaultRegexRules = {
    serie: "serie\\s*[:\\-]?\\s*([A-Z0-9-]+)",
    total: "total\\s*[:\\-]?\\s*([0-9.,]+)",
  };
  const defaultMappingRules = {
    serie: { pattern: "serie\\s*[:\\-]?\\s*([A-Z0-9-]+)" },
    total: { pattern: "total\\s*[:\\-]?\\s*([0-9.,]+)" },
  };
  type FieldHelper = {
    label: string;
    field: string;
    regex: string;
    mapping: Record<string, any>;
  };
  const helpers: FieldHelper[] = [
    { label: "Serie", field: "serie", regex: defaultRegexRules.serie, mapping: defaultMappingRules.serie },
    { label: "Total", field: "total", regex: defaultRegexRules.total, mapping: defaultMappingRules.total },
  ];
  const [regexJson, setRegexJson] = useState(JSON.stringify(defaultRegexRules, null, 2));
  const [mappingJson, setMappingJson] = useState(JSON.stringify(defaultMappingRules, null, 2));
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false);
  const [sampleText, setSampleText] = useState("");
  const [providers, setProviders] = useState<Array<{ id: number; name: string }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const allowPdfSuggestions = process.env.NEXT_PUBLIC_ALLOW_PDF_SUGGESTIONS === "true";

  useEffect(() => {
    let cancelled = false;

    const loadProviders = async () => {
      try {
        const data = await getProviders();
        if (!cancelled) {
          setProviders(data ?? []);
        }
      } catch (error) {
        console.error("Error al cargar proveedores:", error);
      }
    };

    void loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setDocumentType("");
    setProviderId(undefined);
    setVersion("1");
    setPriority("1");
    setIsActive(true);
    setRegexJson(JSON.stringify(defaultRegexRules, null, 2));
    setMappingJson(JSON.stringify(defaultMappingRules, null, 2));
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!documentType.trim()) {
      toast.error("Ingresa el tipo de documento.");
      return;
    }

    let regexRules;
    let fieldMappings;
    try {
      regexRules = regexJson.trim() ? JSON.parse(regexJson) : {};
    } catch (error) {
      toast.error("RegexRules inválido. Asegúrate de enviar JSON válido.");
      return;
    }
    try {
      fieldMappings = mappingJson.trim() ? JSON.parse(mappingJson) : {};
    } catch (error) {
      toast.error("FieldMappings inválido. Corrige el JSON antes de continuar.");
      return;
    }

    const payload: Record<string, any> = {
      documentType: documentType.trim(),
      isActive,
    };
    if (providerId) {
      payload.providerId = providerId;
    }
    if (version) {
      payload.version = Number(version);
    }
    if (priority) {
      payload.priority = Number(priority);
    }
    if (notes.trim()) {
      payload.notes = notes.trim();
    }
    payload.regexRules = regexRules;
    payload.fieldMappings = fieldMappings;

    setIsSaving(true);
    try {
      const response = await authFetch(`${BACKEND_URL}/api/invoice-templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Error al guardar la plantilla");
      }

      toast.success("Plantilla creada correctamente.");
      resetForm();
      setIsOpen(false);
      onCreated?.();
    } catch (error: any) {
      console.error("Error al crear plantilla:", error);
      toast.error(error.message || "No se pudo guardar la plantilla.");
    } finally {
      setIsSaving(false);
    }
  };

  const applyHelper = (helper: { field: string; regex: string; mapping: Record<string, any> }) => {
    try {
      const parsedRegex = regexJson.trim() ? JSON.parse(regexJson) : {};
      parsedRegex[helper.field] = helper.regex;
      setRegexJson(JSON.stringify(parsedRegex, null, 2));
    } catch {
      toast.error("No se pudo aplicar la regla de regex. Asegura que el JSON sea válido.");
      return;
    }

    try {
      const parsedMapping = mappingJson.trim() ? JSON.parse(mappingJson) : {};
      parsedMapping[helper.field] = helper.mapping;
      setMappingJson(JSON.stringify(parsedMapping, null, 2));
    } catch {
      toast.error("No se pudo aplicar el mapeo. Corrige el JSON antes de continuar.");
    }
  };

  const suggestFields = async (text: string) => {
    if (!text.trim()) {
      toast.error("Agrega texto de ejemplo antes de sugerir campos.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await authFetch(`${BACKEND_URL}/api/invoice-templates/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sampleText: text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "No se pudieron sugerir campos.");
      }

      const data = await response.json();
      setRegexJson(JSON.stringify(data.suggestion?.regexRules ?? {}, null, 2));
      setMappingJson(JSON.stringify(data.suggestion?.fieldMappings ?? {}, null, 2));
      toast.success(data.message ?? "Sugerencias generadas.");
    } catch (error: any) {
      console.error("Error al sugerir campos:", error);
      toast.error(error.message || "No se pudieron generar las sugerencias.");
    } finally {
      setIsSaving(false);
    }
  };

  const suggestFromFile = async (file: File) => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await authFetch(`${BACKEND_URL}/api/invoice-templates/suggest-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Error al procesar el PDF.");
      }

      const data = await response.json();
      setRegexJson(JSON.stringify(data.suggestion?.regexRules ?? {}, null, 2));
      setMappingJson(JSON.stringify(data.suggestion?.fieldMappings ?? {}, null, 2));
      toast.success(data.message ?? "Sugerencias generadas desde el PDF.");
      setFile(null);
    } catch (error: any) {
      console.error("Error al sugerir desde PDF:", error);
      toast.error(error.message || "No se pudieron generar las sugerencias.");
    } finally {
      setIsSaving(false);
    }
  };

  const submitCorrection = async () => {
    if (!sampleId) {
      toast.error("No hay muestra asociada para registrar la corrección.");
      return;
    }
    setIsSaving(true);
    try {
      const fieldsParsed = mappingJson.trim() ? JSON.parse(mappingJson) : {};
      const response = await authFetch(
        `${BACKEND_URL}/api/invoice-samples/${sampleId}/corrections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId: providerId ?? undefined,
            text: sampleText.trim() || undefined,
            fields: fieldsParsed,
          }),
        },
      );
      const responseData = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          responseData?.message || "No se pudo guardar la corrección.",
        );
      }
      const metadataInfo = responseData?.mlMetadata
        ? ` (metadata: ${responseData.mlMetadata.source ?? "desconocido"}${
            responseData.mlMetadata.fileHash
              ? ` / hash ${responseData.mlMetadata.fileHash}`
              : ""
          })`
        : "";
      toast.success(
        `Corrección registrada como training data.${metadataInfo}`,
      );
    } catch (error: any) {
      console.error("Error al enviar corrección:", error);
      toast.error(error.message || "No se pudo registrar la corrección.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          Crear plantilla
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:w-[520px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Crear plantilla de factura</AlertDialogTitle>
          <AlertDialogDescription>
            Define reglas y mapeos para que la UI pueda recomendar esta plantilla.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 pt-2 max-h-[80vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="document-type" className="text-sm font-medium">
              Tipo de documento
            </Label>
            <Select
              id="document-type"
              value={documentType}
              onValueChange={(value) => setDocumentType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FACTURA_ELECTRONICA">Factura Electrónica</SelectItem>
                <SelectItem value="GUIA_REMISION">Guía de Remisión</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="provider" className="text-sm font-medium">
              Proveedor
            </Label>
            <Select onValueChange={(value) => setProviderId(Number(value) || undefined)} value={providerId?.toString()}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id.toString()}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="version" className="text-sm font-medium">
                Versión
              </Label>
              <Input
                id="version"
                type="number"
                min={1}
                value={version}
                onChange={(event) => setVersion(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="priority" className="text-sm font-medium">
                Prioridad
              </Label>
              <Input
                id="priority"
                type="number"
                min={1}
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="active-switch" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active-switch" className="text-sm font-medium">
              Activa
            </Label>
          </div>
          <div>
            <Label htmlFor="sample-text" className="text-sm font-medium">
              Texto de muestra (o sube un PDF)
            </Label>
            <Textarea
              id="sample-text"
              className="h-24 font-mono text-[13px]"
              value={sampleText}
              onChange={(event) => setSampleText(event.target.value)}
              placeholder="Pega aquí un fragmento del PDF para sugerir los campos..."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => suggestFields(sampleText)}
                disabled={!sampleText.trim() || isSaving}
                className="text-xs"
              >
                Sugerir texto
              </Button>
              {allowPdfSuggestions ? (
                <>
                  <label className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium cursor-pointer hover:bg-muted">
                    <span>Subir PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(event) => {
                        const selected = event.target.files?.[0] ?? null;
                        if (selected) {
                          setFile(selected);
                        }
                      }}
                    />
                  </label>
                  {file && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => suggestFromFile(file)}
                      disabled={isSaving}
                      className="text-xs"
                    >
                      Usar PDF
                    </Button>
                  )}
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Sugerencias desde PDF pausadas hasta que el stack de inferencia esté listo.
                </span>
              )}
            </div>
            {allowPdfSuggestions && file && (
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="regex-rules" className="text-sm font-medium">
              regexRules (JSON)
            </Label>
            <Textarea
              id="regex-rules"
              className="h-24 font-mono text-[13px]"
              value={regexJson}
              onChange={(event) => setRegexJson(event.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Asistentes para campos comunes</Label>
            <p className="text-xs text-muted-foreground">
              Haz clic para mapear un campo con una regla ya probada. Se insertará automáticamente en
              los JSON presentes y podrás continuar editando si necesitas afinar la expresión.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {helpers.map((helper) => (
                <Button
                  key={helper.field}
                  variant="ghost"
                  size="sm"
                  onClick={() => applyHelper(helper)}
                  disabled={isSaving}
                >
                  Mapear {helper.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="field-mappings" className="text-sm font-medium">
              fieldMappings (JSON)
            </Label>
            <Textarea
              id="field-mappings"
              className="h-24 font-mono text-[13px]"
              value={mappingJson}
              onChange={(event) => setMappingJson(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas
            </Label>
            <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
          <AlertDialogFooter className="space-x-2">
            <AlertDialogCancel onClick={() => setIsOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar plantilla"}
            </AlertDialogAction>
            {sampleId && (
              <Button
                variant="ghost"
                onClick={submitCorrection}
                disabled={isSaving}
              >
                Guardar corrección
              </Button>
            )}
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
