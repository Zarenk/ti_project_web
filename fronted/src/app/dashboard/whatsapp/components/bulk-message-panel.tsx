'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Users, Send } from 'lucide-react';

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Envío Masivo
          </CardTitle>
          <CardDescription>
            Envía el mismo mensaje a múltiples números a la vez
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipients">Números de Teléfono (uno por línea o separados por coma)</Label>
            <Textarea
              id="recipients"
              placeholder="51999999999&#10;51988888888&#10;51977777777"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              disabled={!isConnected}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              {recipientCount} número{recipientCount !== 1 ? 's' : ''} válido{recipientCount !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-message">Mensaje</Label>
            <Textarea
              id="bulk-message"
              placeholder="Escribe el mensaje que se enviará a todos..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!isConnected}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              {message.length} caracteres × {recipientCount} destinatarios
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={!isConnected || isSending || !recipients || !message || recipientCount === 0}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando a {recipientCount} números...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Enviar a {recipientCount} Número{recipientCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados del Envío</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Enviados</p>
                  <p className="text-2xl font-bold text-green-900">{results.sent}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">Fallidos</p>
                  <p className="text-2xl font-bold text-red-900">{results.failed}</p>
                </div>
              </div>

              {results.failed > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Detalles de errores:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.details
                      .filter((r) => !r.success)
                      .map((r, i) => (
                        <div key={i} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
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
  );
}
