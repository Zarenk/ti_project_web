'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccountingSummary } from '@/lib/accounting/types';
import { generateAccountingAlerts, AlertDismissalManager, type AccountingAlert } from '@/lib/accounting/alert-rules';

interface AlertsCardProps {
  summary: AccountingSummary | null;
  onExportClick?: () => void;
}

const ALERT_ICONS = {
  urgent: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const ALERT_STYLES = {
  urgent: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-900',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-900 dark:text-red-100',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-900 dark:text-amber-100',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-900',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-900 dark:text-blue-100',
  },
};

export function AlertsCard({ summary, onExportClick }: AlertsCardProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Generar alertas basadas en el summary
  const allAlerts = summary ? generateAccountingAlerts(summary, onExportClick) : [];

  // Filtrar alertas descartadas
  const visibleAlerts = allAlerts.filter((alert) => !dismissedAlerts.has(alert.id));

  // Cargar alertas descartadas al montar
  useEffect(() => {
    const dismissed = new Set<string>();
    allAlerts.forEach((alert) => {
      if (AlertDismissalManager.isDismissed(alert.id)) {
        dismissed.add(alert.id);
      }
    });
    setDismissedAlerts(dismissed);
  }, [summary]); // Re-check when summary changes

  const handleDismiss = (alertId: string) => {
    AlertDismissalManager.dismiss(alertId);
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  // No mostrar el card si no hay alertas
  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">⚡ Alertas Importantes</CardTitle>
        <CardDescription>
          Avisos automáticos sobre tu situación financiera
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleAlerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onDismiss={alert.dismissible ? () => handleDismiss(alert.id) : undefined}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface AlertItemProps {
  alert: AccountingAlert;
  onDismiss?: () => void;
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const style = ALERT_STYLES[alert.type];
  const Icon = ALERT_ICONS[alert.type];

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4 transition-all',
        style.bg,
        style.border
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', style.icon)} />

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn('font-semibold text-sm leading-tight', style.text)}>
              {alert.title}
            </h4>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-2 hover:bg-transparent"
                onClick={onDismiss}
                aria-label="Descartar alerta"
              >
                <X className={cn('h-4 w-4', style.icon)} />
              </Button>
            )}
          </div>

          <p className={cn('text-sm leading-relaxed', style.text)}>
            {alert.message}
          </p>

          {alert.action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={alert.action.onClick}
            >
              {alert.action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
