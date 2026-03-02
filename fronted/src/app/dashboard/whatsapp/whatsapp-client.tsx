'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTenantSelection } from '@/context/tenant-selection-context';
import { useWhatsAppSocket } from '@/hooks/use-whatsapp-socket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  MessageCircle,
  Phone,
  Send,
  Loader2,
  FileText,
  Zap,
  BarChart3,
  Users,
  Unplug,
  Bot,
} from 'lucide-react';

// Import tab components
import ConnectionPanel from './components/connection-panel';
import SendMessagePanel from './components/send-message-panel';
import BulkMessagePanel from './components/bulk-message-panel';
import MessagesHistoryPanel from './components/messages-history-panel';
import TemplatesPanel from './components/templates-panel';
import AutomationsPanel from './components/automations-panel';
import AutoReplyPanel from './components/auto-reply-panel';
import StatsPanel from './components/stats-panel';

export default function WhatsAppClient() {
  const { selection } = useTenantSelection();
  const organizationId = selection?.orgId ?? null;
  const companyId = selection?.companyId ?? null;

  const socketData = useWhatsAppSocket(organizationId, companyId, true);

  const [activeTab, setActiveTab] = useState('connection');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [hasAuth, setHasAuth] = useState(false);
  const [polledData, setPolledData] = useState<{
    qrCode: string | null;
    isConnected: boolean;
    phoneNumber: string | null;
    status: string;
  } | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Merge socket data with polled data (polled data as fallback)
  const qrCode = socketData.qrCode || polledData?.qrCode || null;
  const isConnected = socketData.isConnected || polledData?.isConnected || false;
  const phoneNumber = socketData.phoneNumber || polledData?.phoneNumber || null;
  const status = socketData.isConnected
    ? 'CONNECTED'
    : socketData.status !== 'DISCONNECTED'
    ? socketData.status
    : polledData?.status || 'DISCONNECTED';

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (!res.ok) return;
      const data = await res.json();
      setPolledData({
        qrCode: data.qrCode || null,
        isConnected: data.isConnected || false,
        phoneNumber: data.phoneNumber || null,
        status: data.session?.status || 'DISCONNECTED',
      });
      if (data.hasAuth !== undefined) setHasAuth(data.hasAuth);
      // Stop polling if connected or failed
      if (data.isConnected || data.session?.status === 'FAILED') {
        setIsPolling(false);
      }
    } catch {
      // Ignore polling errors
    }
  }, []);

  // Initial status check on mount
  useEffect(() => {
    pollStatus();
  }, [pollStatus]);

  // Polling interval
  useEffect(() => {
    if (isPolling) {
      pollStatus();
      pollingRef.current = setInterval(pollStatus, 3000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isPolling, pollStatus]);

  // Stop polling when connected via socket
  useEffect(() => {
    if (socketData.isConnected) {
      setIsPolling(false);
    }
  }, [socketData.isConnected]);

  // Connect: uses existing auth if available (no QR needed), or generates new QR
  const handleConnect = async (fresh = false) => {
    setIsConnecting(true);
    try {
      const url = fresh ? '/api/whatsapp/connect?fresh=true' : '/api/whatsapp/connect';
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        toast.success(fresh ? 'Conectando WhatsApp...' : 'Reconectando...', {
          description: fresh ? 'Esperando codigo QR...' : 'Usando sesion guardada...',
        });
        setIsPolling(true);
      } else {
        toast.error('Error al conectar', {
          description: data.error || 'No se pudo iniciar la conexión',
        });
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Error al conectar WhatsApp');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect: close socket but keep auth (can reconnect without QR)
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        toast.success('WhatsApp desconectado', {
          description: 'Puedes reconectar sin escanear QR nuevamente',
        });
        setPolledData(null);
        setHasAuth(true); // Auth is preserved
      } else {
        toast.error('Error al desconectar');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error al desconectar WhatsApp');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Logout: full unpair, removes device from WhatsApp
  const handleLogout = async () => {
    if (!confirm('¿Desvincular WhatsApp? Necesitaras escanear el codigo QR de nuevo para reconectar.')) return;
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/whatsapp/logout', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        toast.success('WhatsApp desvinculado', {
          description: 'Deberás escanear un nuevo código QR para reconectar',
        });
        setPolledData(null);
        setHasAuth(false);
      } else {
        toast.error('Error al desvincular');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error al desvincular WhatsApp');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Auto-switch to send tab when connected
  useEffect(() => {
    if (isConnected && activeTab === 'connection') {
      setActiveTab('send');
    }
  }, [isConnected, activeTab]);

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">WhatsApp Business</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu WhatsApp y automatiza mensajes a tus clientes
        </p>
      </div>

      {/* Connection Status Banner */}
      <Card className={isConnected
        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40'
        : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
      }>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full ${
                  isConnected
                    ? 'bg-green-500'
                    : status === 'QR_PENDING'
                    ? 'bg-yellow-500'
                    : status === 'CONNECTING'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-400'
                }`}
              />
              <div>
                <p className={`font-medium ${isConnected ? 'text-green-900 dark:text-green-300' : 'text-amber-900 dark:text-amber-300'}`}>
                  {status === 'CONNECTED' && `Conectado como ${phoneNumber}`}
                  {status === 'QR_PENDING' && 'Esperando escaneo de QR'}
                  {status === 'CONNECTING' && 'Conectando...'}
                  {status === 'DISCONNECTED' && (hasAuth ? 'Sesión guardada — no conectado' : 'WhatsApp no conectado')}
                  {status === 'FAILED' && 'Conexión fallida'}
                </p>
                <p className={`text-sm ${isConnected ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {isConnected
                    ? 'Puedes enviar mensajes y gestionar automatizaciones'
                    : hasAuth
                    ? 'Haz clic en Reconectar para restablecer la conexión'
                    : 'Conecta WhatsApp para comenzar'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="cursor-pointer"
                >
                  {isDisconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="mr-2 h-4 w-4" />
                  )}
                  Desconectar
                </Button>
              ) : !qrCode && (
                <Button
                  onClick={() => handleConnect(false)}
                  disabled={isConnecting || status === 'CONNECTING'}
                  className="cursor-pointer"
                >
                  {isConnecting || status === 'CONNECTING' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {hasAuth ? 'Reconectando...' : 'Conectando...'}
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {hasAuth ? 'Reconectar' : 'Conectar WhatsApp'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8">
          <TabsTrigger value="connection" className="gap-1.5 cursor-pointer">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Conexion</span>
          </TabsTrigger>
          <TabsTrigger value="send" disabled={!isConnected} className="gap-1.5 cursor-pointer">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" disabled={!isConnected} className="gap-1.5 cursor-pointer">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Masivo</span>
          </TabsTrigger>
          <TabsTrigger value="messages" disabled={!isConnected} className="gap-1.5 cursor-pointer">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Mensajes</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 cursor-pointer">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Plantillas</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5 cursor-pointer">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automaciones</span>
          </TabsTrigger>
          <TabsTrigger value="auto-reply" className="gap-1.5 cursor-pointer">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Chatbot</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5 cursor-pointer">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <ConnectionPanel
            qrCode={qrCode}
            isConnected={isConnected}
            phoneNumber={phoneNumber}
            status={status}
            hasAuth={hasAuth}
            isConnecting={isConnecting}
            isDisconnecting={isDisconnecting}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onLogout={handleLogout}
          />
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <SendMessagePanel isConnected={isConnected} />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkMessagePanel isConnected={isConnected} />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <MessagesHistoryPanel />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesPanel />
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          <AutomationsPanel />
        </TabsContent>

        <TabsContent value="auto-reply" className="space-y-4">
          <AutoReplyPanel />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <StatsPanel />
        </TabsContent>
      </Tabs>
      </div>
    </section>
  );
}
