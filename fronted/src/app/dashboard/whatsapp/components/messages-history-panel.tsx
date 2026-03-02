'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, MessageCircle, RefreshCw, Search, Image, FileText, Mic, Video, MapPin, Smile, Contact } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Protocol/internal messages that should never be shown
const HIDDEN_CONTENT_PREFIXES = [
  '[protocolMessage]',
  '[senderKeyDistributionMessage]',
  '[messageContextInfo]',
  '[reactionMessage]',
  '[ephemeralMessage]',
  '[keepInChatMessage]',
  '[peerDataOperationRequestResponseMessage]',
];

interface Message {
  id: number;
  remoteJid: string;
  content: string;
  messageType: string;
  isFromMe: boolean;
  status: string;
  sentAt: string;
  createdAt: string;
}

export default function MessagesHistoryPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState('50');

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (limit) queryParams.set('limit', limit);

      const response = await fetch(`/api/whatsapp/messages?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
      } else {
        toast.error('Error al cargar mensajes');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Error al cargar mensajes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // Filter out protocol messages (already saved in DB from before the backend fix)
  const filteredMessages = messages
    .filter((msg) => !HIDDEN_CONTENT_PREFIXES.includes(msg.content))
    .filter((msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.remoteJid.includes(searchQuery)
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Historial de Mensajes
            </CardTitle>
            <CardDescription>
              Últimos {messages.length} mensajes enviados y recibidos
            </CardDescription>
          </div>
          <Button onClick={loadMessages} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por contenido o número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-32">
            <Input
              type="number"
              placeholder="Límite"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              min="10"
              max="500"
            />
          </div>
        </div>

        {/* Messages List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Cargando mensajes...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No hay mensajes para mostrar</p>
            {searchQuery && <p className="text-sm">Intenta con otra búsqueda</p>}
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg border ${
                  msg.isFromMe
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 ml-8'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 mr-8'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {msg.isFromMe ? 'Tú' : msg.remoteJid.split('@')[0]}
                    </span>
                    <Badge variant={msg.status === 'SENT' ? 'default' : 'secondary'} className="text-xs">
                      {msg.status}
                    </Badge>
                    {msg.messageType !== 'TEXT' && (
                      <Badge variant="outline" className="text-xs gap-1">
                        {msg.messageType === 'IMAGE' && <Image className="h-3 w-3" />}
                        {msg.messageType === 'VIDEO' && <Video className="h-3 w-3" />}
                        {msg.messageType === 'AUDIO' && <Mic className="h-3 w-3" />}
                        {msg.messageType === 'DOCUMENT' && <FileText className="h-3 w-3" />}
                        {msg.messageType}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(msg.sentAt || msg.createdAt), 'PPp', { locale: es })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-foreground break-words">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
