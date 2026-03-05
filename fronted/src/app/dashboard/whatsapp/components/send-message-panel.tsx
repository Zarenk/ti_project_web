'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { isSubscriptionBlockedError } from '@/lib/subscription-error';
import { SubscriptionBlockedDialog } from '@/components/subscription-blocked-dialog';

interface SendMessagePanelProps {
  isConnected: boolean;
}

export default function SendMessagePanel({ isConnected }: SendMessagePanelProps) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);

  const handleSend = async () => {
    if (!recipient || !message) {
      toast.error('Completa todos los campos');
      return;
    }

    // Validar formato de número
    const cleanNumber = recipient.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      toast.error('Número inválido', {
        description: 'El número debe tener al menos 10 dígitos',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: cleanNumber,
          content: message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Mensaje enviado correctamente');
        setMessage('');
        setRecipient('');
      } else {
        if (isSubscriptionBlockedError(data.message ?? data.error ?? '')) {
          setSubscriptionBlocked(true);
          return;
        }
        toast.error('Error al enviar mensaje', {
          description: data.error || 'No se pudo enviar el mensaje',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
          <Send className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          Enviar Mensaje
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Envía un mensaje de WhatsApp a cualquier número
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="recipient" className="text-xs sm:text-sm">Número de Teléfono</Label>
          <Input
            id="recipient"
            type="text"
            placeholder="51999999999"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={!isConnected}
            className="h-8 sm:h-9 text-sm"
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Código de país + número sin espacios (ej: 51999999999)
          </p>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="message" className="text-xs sm:text-sm">Mensaje</Label>
          <Textarea
            id="message"
            placeholder="Escribe tu mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isConnected}
            rows={5}
            className="text-sm resize-none"
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {message.length} caracteres
          </p>
        </div>

        <Button
          onClick={handleSend}
          disabled={!isConnected || isSending || !recipient || !message}
          className="w-full cursor-pointer text-xs sm:text-sm h-9 sm:h-10"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-4 w-4" />
              Enviar Mensaje
            </>
          )}
        </Button>

        {!isConnected && (
          <p className="text-xs sm:text-sm text-muted-foreground text-center pt-1 sm:pt-2">
            Conecta WhatsApp primero para enviar mensajes
          </p>
        )}
      </CardContent>
    </Card>
    <SubscriptionBlockedDialog
      open={subscriptionBlocked}
      onOpenChange={setSubscriptionBlocked}
      feature="envío de WhatsApp"
    />
    </>
  );
}
