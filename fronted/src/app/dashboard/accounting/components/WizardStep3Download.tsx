'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, ExternalLink, Loader2 } from 'lucide-react';
import type { PleExportParams } from '@/lib/accounting/types';
import { downloadPleExport } from '../accounting.api';
import { toast } from 'sonner';

interface WizardStep3DownloadProps {
  params: PleExportParams;
  downloading: boolean;
  onDownloadingChange: (downloading: boolean) => void;
  onComplete: () => void;
}

export function WizardStep3Download({
  params,
  downloading,
  onDownloadingChange,
  onComplete,
}: WizardStep3DownloadProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    try {
      onDownloadingChange(true);
      await downloadPleExport(params);
      setDownloaded(true);
      toast.success('Archivo descargado correctamente');
    } catch (error) {
      console.error('Error downloading PLE:', error);
      toast.error('No se pudo descargar el archivo. Intenta nuevamente.');
    } finally {
      onDownloadingChange(false);
    }
  };

  const formatPeriodLabel = (period: string) => {
    const [year, month] = period.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const formatTypeLabel = (format: string) => {
    return format === '5.1' ? 'Libro Diario' : 'Libro Mayor';
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          {downloaded ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <Download className="h-6 w-6 text-primary" />
          )}
        </div>
        <h3 className="text-lg font-semibold">
          {downloaded ? '¡Archivo listo!' : 'Paso 3: Descargar'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {downloaded
            ? 'Ahora sube el archivo a SUNAT SOL'
            : 'Descarga el archivo TXT para subir a SUNAT'}
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-sm font-medium">Resumen de exportación:</p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Período:</span>
              <span className="font-medium text-foreground">
                {formatPeriodLabel(params.period)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Formato:</span>
              <span className="font-medium text-foreground">
                {formatTypeLabel(params.format)} ({params.format})
              </span>
            </div>
          </div>
        </div>

        {!downloaded ? (
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full"
            size="lg"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando archivo...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descargar archivo TXT
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Volver a descargar
          </Button>
        )}
      </div>

      <div className="rounded-lg bg-muted p-4 space-y-3">
        <p className="text-sm font-medium">📋 ¿Qué hago ahora?</p>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Descarga el archivo TXT usando el botón de arriba</li>
          <li>Ingresa a <strong>SUNAT SOL</strong> con tu clave</li>
          <li>Ve a <strong>Declaración y Pago → PLE</strong></li>
          <li>Sube el archivo TXT que descargaste</li>
          <li>Valida y envía tu declaración</li>
        </ol>

        <Button
          variant="link"
          className="p-0 h-auto text-xs"
          onClick={() => window.open('https://www.sunat.gob.pe/', '_blank')}
        >
          Ir a SUNAT SOL
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {downloaded && (
        <Button
          onClick={onComplete}
          className="w-full"
          variant="outline"
        >
          Finalizar
        </Button>
      )}
    </div>
  );
}
