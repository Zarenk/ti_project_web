'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WizardStep1PeriodSelector } from './WizardStep1PeriodSelector';
import { WizardStep2BookType } from './WizardStep2BookType';
import { WizardStep3Download } from './WizardStep3Download';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PleExportParams } from '@/lib/accounting/types';

interface ExportWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 1 | 2 | 3;

export function ExportWizardModal({ open, onOpenChange }: ExportWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [exportParams, setExportParams] = useState<Partial<PleExportParams>>({});
  const [downloading, setDownloading] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    // Reset wizard after animation
    setTimeout(() => {
      setCurrentStep(1);
      setExportParams({});
      setDownloading(false);
    }, 200);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return !!exportParams.period;
    if (currentStep === 2) return !!exportParams.format;
    return false;
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`
                h-2 w-2 rounded-full transition-all
                ${step === currentStep ? 'bg-primary w-8' : step < currentStep ? 'bg-primary' : 'bg-muted'}
              `}
            />
            {step < 3 && (
              <div
                className={`
                  h-0.5 w-8 mx-1
                  ${step < currentStep ? 'bg-primary' : 'bg-muted'}
                `}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar para SUNAT</DialogTitle>
          <DialogDescription>
            Genera archivos PLE (Programa de Libros Electrónicos) para presentar a SUNAT
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="min-h-[300px]">
          {currentStep === 1 && (
            <WizardStep1PeriodSelector
              selectedPeriod={exportParams.period}
              onPeriodChange={(period) => setExportParams({ ...exportParams, period })}
            />
          )}

          {currentStep === 2 && (
            <WizardStep2BookType
              selectedFormat={exportParams.format}
              onFormatChange={(format) => setExportParams({ ...exportParams, format })}
            />
          )}

          {currentStep === 3 && exportParams.period && exportParams.format && (
            <WizardStep3Download
              params={exportParams as PleExportParams}
              downloading={downloading}
              onDownloadingChange={setDownloading}
              onComplete={handleClose}
            />
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={currentStep === 1 ? handleClose : handleBack}
            disabled={downloading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 1 ? 'Cancelar' : 'Atrás'}
          </Button>

          {currentStep < 3 && (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
