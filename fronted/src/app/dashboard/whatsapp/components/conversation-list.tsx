'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MessageCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/chat-utils';
import {
  formatPhoneNumber,
  getContactInitial,
  getMessagePreview,
  isHiddenMessage,
} from './wa-chat-utils';

export interface Conversation {
  remoteJid: string;
  phoneNumber: string;
  lastMessage: string;
  lastMessageType: string;
  lastIsFromMe: boolean;
  lastMessageAt: string;
  totalMessages: number;
  unreadCount: number;
  client: {
    id: number;
    name: string;
    phone: string | null;
    image: string | null;
  } | null;
}

interface ConversationListProps {
  selectedJid: string | null;
  onSelect: (jid: string) => void;
}

export default function ConversationList({ selectedJid, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConversations = useCallback(async (search?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/whatsapp/conversations?${params}`);
      const data = await res.json();

      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadConversations(value);
    }, 300);
  };

  /** Update a conversation when a new message arrives (called from parent) */
  const updateConversation = useCallback((remoteJid: string, content: string, messageType: string, isFromMe: boolean) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.remoteJid === remoteJid);
      if (idx === -1) {
        // New conversation — reload
        loadConversations(searchQuery);
        return prev;
      }

      const updated = [...prev];
      const conv = { ...updated[idx] };
      conv.lastMessage = content;
      conv.lastMessageType = messageType;
      conv.lastIsFromMe = isFromMe;
      conv.lastMessageAt = new Date().toISOString();
      if (!isFromMe && remoteJid !== selectedJid) {
        conv.unreadCount++;
      }
      updated.splice(idx, 1);
      updated.unshift(conv); // Move to top
      return updated;
    });
  }, [loadConversations, searchQuery, selectedJid]);

  /** Clear unread for a conversation */
  const clearUnread = useCallback((remoteJid: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.remoteJid === remoteJid ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  // Expose methods via ref-like pattern (used by parent)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (window as any).__waConvList = { updateConversation, clearUnread, reload: () => loadConversations(searchQuery) };
    return () => { delete (window as any).__waConvList; };
  });

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
      {/* Search */}
      <div className="p-2 sm:p-3 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar contacto..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-8 sm:h-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Sin resultados' : 'No hay conversaciones'}
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const displayName = conv.client?.name || formatPhoneNumber(conv.remoteJid);
            const initial = getContactInitial(conv.client?.name, conv.phoneNumber);
            const isSelected = conv.remoteJid === selectedJid;
            const preview = isHiddenMessage(conv.lastMessage)
              ? 'Mensaje'
              : getMessagePreview(conv.lastMessage, conv.lastMessageType);

            return (
              <button
                key={conv.remoteJid}
                onClick={() => onSelect(conv.remoteJid)}
                className={`w-full text-left px-2.5 sm:px-3 py-2.5 sm:py-3 border-b cursor-pointer transition-colors hover:bg-accent/50 ${
                  isSelected ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-start gap-2.5 w-full min-w-0">
                  {/* Avatar */}
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm sm:text-base font-semibold text-primary">
                      {initial}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatRelativeTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastIsFromMe && <span className="text-muted-foreground/70">Tú: </span>}
                        {preview}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge className="h-4.5 min-w-[18px] px-1 text-[10px] rounded-full flex-shrink-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
