'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AccountingMetricsGrid } from './components/AccountingMetricsGrid';
import { AlertsCard } from './components/AlertsCard';
import { ContextualHelpCard } from './components/ContextualHelpCard';
import { ExportWizardModal } from './components/ExportWizardModal';
import { useAccountingSummary } from './hooks/useAccountingSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const quickLinks = [
  { title: 'Plan de Cuentas', href: '/dashboard/accounting/chart' },
  { title: 'Diarios', href: '/dashboard/accounting/journals' },
  { title: 'Asientos', href: '/dashboard/accounting/entries' },
  { title: 'Libro Mayor', href: '/dashboard/accounting/reports/ledger' },
  { title: 'Balance de Comprobación', href: '/dashboard/accounting/reports/trial-balance' },
];

export default function AccountingDashboardPage() {
  const { summary, loading, refetch } = useAccountingSummary();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contabilidad</h1>
          <p className="text-muted-foreground mt-1">
            Resumen financiero de tu negocio en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <CardTitle className="text-base">Acceso rápido a módulos contables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent hover:border-primary/50 transition-all group"
              >
                <span className="text-sm font-medium">{link.title}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de exportación */}
      <ExportWizardModal open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
