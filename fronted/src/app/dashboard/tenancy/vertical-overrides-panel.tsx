'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  getCompanyVerticalOverride,
  updateCompanyVerticalOverride,
  deleteCompanyVerticalOverride,
  type CompanyVerticalOverride,
} from './tenancy.api';

interface VerticalOverridesPanelProps {
  companyId: number;
  organizationId: number;
  disabled?: boolean;
}

export function VerticalOverridesPanel({
  companyId,
  organizationId,
  disabled = false,
}: VerticalOverridesPanelProps) {
  const [override, setOverride] = useState<CompanyVerticalOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadOverride = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanyVerticalOverride(companyId);
      setOverride(data);
      if (data.configJson) {
        setEditValue(JSON.stringify(data.configJson, null, 2));
      } else {
        setEditValue('{}');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar la configuracion';
      setError(message);
      setOverride(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadOverride();
  }, [loadOverride]);

  const handleStartEdit = () => {
    setEditing(true);
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setValidationError(null);
    if (override?.configJson) {
      setEditValue(JSON.stringify(override.configJson, null, 2));
    } else {
      setEditValue('{}');
    }
  };

  const handleSave = async () => {
    setValidationError(null);

    // Validate JSON
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(editValue);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setValidationError('La configuracion debe ser un objeto JSON valido.');
        return;
      }
    } catch (err) {
      setValidationError('JSON invalido. Verifica la sintaxis.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCompanyVerticalOverride(companyId, parsed);
      setOverride(updated);
      setEditing(false);
      toast.success('Configuracion personalizada guardada correctamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar la configuracion';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCompanyVerticalOverride(companyId);
      setOverride({ companyId, configJson: null });
      setEditValue('{}');
      setDeleteDialogOpen(false);
      toast.success('Configuracion personalizada eliminada correctamente');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar la configuracion';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const hasOverride = Boolean(override?.configJson);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <Loader2 className="size-4 animate-spin" />
        Cargando configuracion personalizada...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-100 p-3 text-xs dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Configuracion personalizada
          </p>
          {hasOverride && !editing ? (
            <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              Esta empresa tiene una configuracion personalizada activa
            </p>
          ) : !hasOverride && !editing ? (
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Sin configuracion personalizada (usando configuracion base del vertical)
            </p>
          ) : null}
        </div>
        {!editing && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              disabled={disabled}
              className="h-7 gap-1 px-2 text-[11px]"
            >
              {hasOverride ? 'Editar' : 'Crear'}
            </Button>
            {hasOverride && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={disabled}
                className="h-7 gap-1 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="size-3" />
                Eliminar
              </Button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="override-json" className="text-[11px]">
              Configuracion JSON
            </Label>
            <Textarea
              id="override-json"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder='{\n  "features": {\n    "sales": true\n  }\n}'
              className="min-h-[200px] font-mono text-[11px]"
              disabled={saving}
            />
            {validationError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-[10px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                <AlertCircle className="size-3 flex-shrink-0" />
                {validationError}
              </div>
            )}
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              La configuracion personalizada se fusiona con la configuracion base del vertical.
              Las propiedades definidas aqui sobrescriben las del vertical base.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={saving}
              className="h-7 gap-1 px-3 text-[11px]"
            >
              <X className="size-3" />
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-7 gap-1 px-3 text-[11px]"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="size-3" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      ) : hasOverride ? (
        <div className="space-y-2">
          <Separator />
          <div>
            <Label className="text-[11px] text-slate-500 dark:text-slate-400">
              Vista previa
            </Label>
            <pre className="mt-1 max-h-[150px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
              {JSON.stringify(override.configJson, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-5" />
              Eliminar configuracion personalizada
            </DialogTitle>
            <DialogDescription>
              ¿Estas seguro de eliminar la configuracion personalizada de esta empresa?
              <br />
              <br />
              La empresa volvera a usar la configuracion base del vertical actual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
