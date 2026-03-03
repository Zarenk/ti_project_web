'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, QrCode, Unplug, LogOut, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ConnectionPanelProps {
  qrCode: string | null;
  isConnected: boolean;
  phoneNumber: string | null;
  status: string;
  hasAuth: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  onConnect: (fresh?: boolean) => void;
  onDisconnect: () => void;
  onLogout: () => void;
}

export default function ConnectionPanel({
  qrCode,
  isConnected,
  phoneNumber,
  status,
  hasAuth,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onLogout,
}: ConnectionPanelProps) {
  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-base sm:text-lg">Conexión WhatsApp</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Vincula tu número de WhatsApp para enviar mensajes desde el sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
        {/* QR Code Display */}
        {qrCode && !isConnected && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <QrCode className="h-4 w-4 flex-shrink-0" />
              Escanea este código QR con WhatsApp
            </div>
            <div className="flex justify-center">
              <div className="bg-white p-3 sm:p-4 rounded-lg border inline-block">
                <QRCodeSVG value={qrCode} size={200} level="M" className="w-[180px] h-[180px] sm:w-[256px] sm:h-[256px]" />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 dark:bg-blue-950/40 dark:border-blue-800">
              <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-300 font-medium mb-1.5 sm:mb-2">Pasos para conectar:</p>
              <ol className="text-xs sm:text-sm text-blue-800 dark:text-blue-400 space-y-0.5 sm:space-y-1 list-decimal list-inside">
                <li>Abre WhatsApp en tu teléfono</li>
                <li>Ve a Configuración &rarr; Dispositivos vinculados</li>
                <li>Toca &quot;Vincular un dispositivo&quot;</li>
                <li>Escanea este código QR</li>
              </ol>
            </div>
          </div>
        )}

        {/* Connected Status */}
        {isConnected && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 dark:bg-green-950/40 dark:border-green-800">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium text-green-900 dark:text-green-300">WhatsApp Conectado</p>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-400 break-all">Número: {phoneNumber}</p>
                  <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-500 mt-0.5 sm:mt-1">
                    La sesión se mantiene activa incluso si reinicias el servidor
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                disabled={isDisconnecting}
                className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9"
              >
                {isDisconnecting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="mr-1.5 h-3.5 w-3.5" />
                )}
                Desconectar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                disabled={isDisconnecting}
                className="cursor-pointer text-xs sm:text-sm h-8 sm:h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Desvincular
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-2.5 sm:p-3 text-[10px] sm:text-xs text-muted-foreground space-y-0.5 sm:space-y-1">
              <p><strong>Desconectar:</strong> Cierra la conexión temporalmente. Puedes reconectar sin escanear QR.</p>
              <p><strong>Desvincular:</strong> Elimina el vínculo con WhatsApp. Necesitarás escanear QR de nuevo.</p>
            </div>
          </div>
        )}

        {/* Disconnected — has saved session (can reconnect without QR) */}
        {!isConnected && !qrCode && hasAuth && (
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 dark:bg-amber-950/40 dark:border-amber-800">
              <p className="text-sm sm:text-base font-medium text-amber-900 dark:text-amber-300">Sesión guardada</p>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 mt-1">
                Tu WhatsApp fue vinculado previamente. Puedes reconectar sin escanear QR.
              </p>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button
                onClick={() => onConnect(false)}
                disabled={isConnecting || status === 'CONNECTING'}
                className="cursor-pointer h-9 sm:h-10 text-sm"
              >
                {isConnecting || status === 'CONNECTING' ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Reconectando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Reconectar
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onConnect(true)}
                disabled={isConnecting}
                className="cursor-pointer h-9 sm:h-10 text-sm"
              >
                <QrCode className="mr-1.5 h-3.5 w-3.5" />
                Nuevo QR
              </Button>
            </div>
          </div>
        )}

        {/* No session at all — first time setup */}
        {!isConnected && !qrCode && !hasAuth && status !== 'CONNECTING' && (
          <div className="text-center space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="text-muted-foreground">
              <p className="text-sm sm:text-base">WhatsApp no está conectado</p>
              <p className="text-xs sm:text-sm">Conecta tu número para comenzar a enviar mensajes</p>
            </div>
            <Button
              onClick={() => onConnect(true)}
              disabled={isConnecting}
              className="cursor-pointer h-9 sm:h-10 text-sm"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </div>
        )}

        {/* Connecting state without QR yet */}
        {!isConnected && !qrCode && status === 'CONNECTING' && !isConnecting && (
          <div className="text-center space-y-3 py-4">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-xs sm:text-sm text-muted-foreground">Estableciendo conexión...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
