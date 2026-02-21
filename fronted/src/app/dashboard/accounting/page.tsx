'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AccountingMetricsGrid } from './components/AccountingMetricsGrid';
import { AlertsCard } from './components/AlertsCard';
import { ContextualHelpCard } from './components/ContextualHelpCard';
import { ExportWizardModal } from './components/ExportWizardModal';
import { useAccountingSummary } from './hooks/useAccountingSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, RefreshCw, ChevronRight, DollarSign, Heart, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { AccountingModeToggle } from '@/components/accounting-mode-toggle';
import { useAccountingMode } from '@/context/accounting-mode-context';
import { PageGuideButton } from '@/components/page-guide-dialog';
import { ACCOUNTING_GUIDE_STEPS } from './accounting-guide-steps';

const quickLinksContador = [
  { title: 'Plan de Cuentas', href: '/dashboard/accounting/chart', description: 'Catálogo de cuentas contables' },
  { title: 'Diarios', href: '/dashboard/accounting/journals', description: 'Registro cronológico de operaciones' },
  { title: 'Asientos', href: '/dashboard/accounting/entries', description: 'Asientos contables manuales' },
  { title: 'Libro Mayor', href: '/dashboard/accounting/reports/ledger', description: 'Movimientos por cuenta' },
  { title: 'Balance de Comprobación', href: '/dashboard/accounting/reports/trial-balance', description: 'Saldos de cuentas' },
];

const quickLinksSimple = [
  {
    title: 'Mi Dinero',
    href: '/dashboard/accounting/dinero',
    description: 'Estado de tu efectivo y flujo de caja',
    icon: DollarSign,
  },
  {
    title: 'Salud del Negocio',
    href: '/dashboard/accounting/salud',
    description: 'Cómo está tu empresa financieramente',
    icon: Heart,
  },
  {
    title: 'SUNAT',
    href: '/dashboard/accounting/sunat',
    description: 'Cumplimiento tributario y exportaciones',
    icon: FileText,
  },
];

export default function AccountingDashboardPage() {
  const { mode, isSimpleMode } = useAccountingMode();
  const { summary, loading, refetch } = useAccountingSummary();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const quickLinks = isSimpleMode ? quickLinksSimple : quickLinksContador;

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();
      toast.success('Dashboard actualizado');
    } catch (error) {
      toast.error('No se pudo actualizar el dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportClick = () => {
    setWizardOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Contabilidad</h1>
            <PageGuideButton steps={ACCOUNTING_GUIDE_STEPS} tooltipLabel="Guía de contabilidad" />
          </div>
          <p className="text-muted-foreground mt-1">
            {isSimpleMode
              ? 'Información financiera de tu negocio de forma sencilla'
              : 'Resumen financiero de tu negocio en tiempo real'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <AccountingModeToggle variant="compact" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button variant="default" size="sm" onClick={handleExportClick}>
            <Download className="h-4 w-4 mr-2" />
            Exportar para SUNAT
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <AccountingMetricsGrid />

      {/* Grid de 2 columnas para alertas + ayuda contextual */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AlertsCard summary={summary} onExportClick={handleExportClick} />
        </div>

        <div>
          <ContextualHelpCard />
        </div>
      </div>

      {/* Enlaces rápidos a otros módulos contables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isSimpleMode ? 'Acceso rápido' : 'Acceso rápido a módulos contables'}
          </CardTitle>
          {isSimpleMode && (
            <CardDescription>Visualiza tu información financiera de forma simple</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickLinks.map((link) => {
              const Icon = 'icon' in link ? link.icon : null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{link.title}</div>
                      {link.description && (
                        <div className="text-xs text-muted-foreground mt-1">{link.description}</div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal de exportación */}
      <ExportWizardModal open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
