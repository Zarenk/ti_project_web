'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Users, Send } from 'lucide-react';
import { isSubscriptionBlockedError } from '@/lib/subscription-error';
import { SubscriptionBlockedDialog } from '@/components/subscription-blocked-dialog';

interface SendMessagePanelProps {
  isConnected: boolean;
}

export default function BulkMessagePanel({ isConnected }: SendMessagePanelProps) {
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<{
    sent: number;
    failed: number;
    details: Array<{ recipient: string; success: boolean; error?: string }>;
  } | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  const handleSend = async () => {
    if (!recipients || !message) {
      toast.error('Completa todos los campos');
      return;
    }

    // Parse recipients (one per line or comma-separated)
    const recipientList = recipients
      .split(/[\n,]/)
      .map((r) => r.trim().replace(/\D/g, ''))
      .filter((r) => r.length >= 10);

    if (recipientList.length === 0) {
      toast.error('No hay números válidos para enviar');
      return;
    }

    setIsSending(true);
    setResults(null);

    try {
      const response = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: recipientList,
          content: message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults({
          sent: data.sent,
          failed: data.failed,
          details: data.results,
        });

        toast.success(`Mensajes enviados: ${data.sent}/${recipientList.length}`, {
          description: data.failed > 0 ? `${data.failed} fallidos` : 'Todos enviados correctamente',
        });

        if (data.sent > 0) {
          setMessage('');
          setRecipients('');
        }
      } else {
        if (isSubscriptionBlockedError(data.message ?? data.error ?? '')) {
          setSubscriptionBlocked(true);
          return;
        }
        toast.error('Error al enviar mensajes', {
          description: data.error || 'No se pudo completar el envío',
        });
      }
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      toast.error('Error al enviar mensajes');
    } finally {
      setIsSending(false);
    }
  };

  const recipientCount = recipients
    .split(/[\n,]/)
    .map((r) => r.trim())
    .filter((r) => r.length >= 10).length;

  return (
    <>
    <div className="space-y-3 sm:space-y-4 w-full min-w-0">
      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Envío Masivo
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Envía el mismo mensaje a múltiples números
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="recipients" className="text-xs sm:text-sm">Números (uno por línea o coma)</Label>
            <Textarea
              id="recipients"
              placeholder="51999999999&#10;51988888888&#10;51977777777"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              disabled={!isConnected}
              rows={5}
              className="text-sm resize-none"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {recipientCount} número{recipientCount !== 1 ? 's' : ''} válido{recipientCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="bulk-message" className="text-xs sm:text-sm">Mensaje</Label>
            <Textarea
              id="bulk-message"
              placeholder="Escribe el mensaje que se enviará a todos..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!isConnected}
              rows={5}
              className="text-sm resize-none"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {message.length} caracteres × {recipientCount} destinatarios
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={!isConnected || isSending || !recipients || !message || recipientCount === 0}
            className="w-full cursor-pointer text-xs sm:text-sm h-9 sm:h-10"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Enviando a {recipientCount}...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Enviar a {recipientCount} Número{recipientCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">Resultados del Envío</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <div className="bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">Enviados</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-200">{results.sent}</p>
                </div>
                <div className="bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">Fallidos</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-900 dark:text-red-200">{results.failed}</p>
                </div>
              </div>

              {results.failed > 0 && (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium">Detalles de errores:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.details
                      .filter((r) => !r.success)
                      .map((r, i) => (
                        <div key={i} className="text-xs sm:text-sm p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded break-words">
                          <span className="font-medium">{r.recipient}:</span> {r.error}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    <SubscriptionBlockedDialog
      open={subscriptionBlocked}
      onOpenChange={setSubscriptionBlocked}
      feature="envío masivo de WhatsApp"
    />
    </>
  );
}
