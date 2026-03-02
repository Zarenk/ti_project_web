'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';

interface SendMessagePanelProps {
  isConnected: boolean;
}

export default function SendMessagePanel({ isConnected }: SendMessagePanelProps) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Enviar Mensaje Individual
        </CardTitle>
        <CardDescription>
          Envía un mensaje de WhatsApp a cualquier número
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Número de Teléfono</Label>
          <Input
            id="recipient"
            type="text"
            placeholder="51999999999 (código de país + número)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={!isConnected}
          />
          <p className="text-xs text-muted-foreground">
            Formato: código de país + número sin espacios ni símbolos (ej: 51999999999)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Mensaje</Label>
          <Textarea
            id="message"
            placeholder="Escribe tu mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!isConnected}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            {message.length} caracteres
          </p>
        </div>

        <Button
          onClick={handleSend}
          disabled={!isConnected || isSending || !recipient || !message}
          className="w-full"
          size="lg"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Enviar Mensaje
            </>
          )}
        </Button>

        {!isConnected && (
          <p className="text-sm text-muted-foreground text-center pt-2">
            Conecta WhatsApp primero para enviar mensajes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
