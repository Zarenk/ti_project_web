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
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Historial de Mensajes
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Últimos {messages.length} mensajes
            </CardDescription>
          </div>
          <Button onClick={loadMessages} disabled={isLoading} variant="outline" size="sm" className="cursor-pointer h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 sm:pl-9 h-8 sm:h-9 text-sm"
            />
          </div>
          <div className="w-16 sm:w-24 flex-shrink-0">
            <Input
              type="number"
              placeholder="Límite"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              min="10"
              max="500"
              className="h-8 sm:h-9 text-sm"
            />
          </div>
        </div>

        {/* Messages List */}
        {isLoading ? (
          <div className="text-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">Cargando mensajes...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-muted-foreground">
            <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No hay mensajes para mostrar</p>
            {searchQuery && <p className="text-xs sm:text-sm">Intenta con otra búsqueda</p>}
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 sm:p-4 rounded-lg border w-full min-w-0 overflow-hidden ${
                  msg.isFromMe
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 ml-4 sm:ml-8'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 mr-4 sm:mr-8'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-medium text-xs sm:text-sm">
                      {msg.isFromMe ? 'Tú' : msg.remoteJid.split('@')[0]}
                    </span>
                    <Badge variant={msg.status === 'SENT' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                      {msg.status}
                    </Badge>
                    {msg.messageType !== 'TEXT' && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs gap-1">
                        {msg.messageType === 'IMAGE' && <Image className="h-3 w-3" />}
                        {msg.messageType === 'VIDEO' && <Video className="h-3 w-3" />}
                        {msg.messageType === 'AUDIO' && <Mic className="h-3 w-3" />}
                        {msg.messageType === 'DOCUMENT' && <FileText className="h-3 w-3" />}
                        {msg.messageType}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(msg.sentAt || msg.createdAt), 'PPp', { locale: es })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm whitespace-pre-wrap text-foreground break-words">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
