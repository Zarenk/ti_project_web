'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageCircle, Send, Inbox, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Stats {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  failedMessages: number;
  activeAutomations: number;
}

export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        toast.error('Error al cargar estadísticas');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Cargando estadísticas...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  const total = stats.totalMessages ?? 0;
  const sent = stats.sentMessages ?? 0;
  const received = stats.receivedMessages ?? 0;
  const failed = stats.failedMessages ?? 0;
  const activeAuto = stats.activeAutomations ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Mensajes</CardTitle>
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Enviados y recibidos</p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Enviados</CardTitle>
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{sent.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {total > 0
                ? `${((sent / total) * 100).toFixed(1)}% del total`
                : 'Sin mensajes'}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Recibidos</CardTitle>
            <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{received.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {total > 0
                ? `${((received / total) * 100).toFixed(1)}% del total`
                : 'Sin mensajes'}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Fallidos</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{failed.toLocaleString()}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {sent > 0
                ? `${((failed / sent) * 100).toFixed(1)}% enviados`
                : 'Sin envíos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automatizaciones y Rendimiento */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Automatizaciones</CardTitle>
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">{activeAuto}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Activas</p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Tasa de Éxito</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-xl sm:text-2xl font-bold">
              {sent > 0
                ? `${(((sent - failed) / sent) * 100).toFixed(1)}%`
                : 'N/A'}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Enviados exitosamente</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
