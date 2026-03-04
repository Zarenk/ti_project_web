'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Loader2,
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  Info,
  X,
  ChevronUp,
  User,
  ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  formatPhoneNumber,
  getContactInitial,
  groupWhatsAppMessages,
  isHiddenMessage,
  type WAMessage,
  type GroupedWAMessage,
} from './wa-chat-utils';

interface ChatViewProps {
  remoteJid: string;
  isConnected: boolean;
  onBack: () => void;
}

interface ContactInfo {
  phoneNumber: string;
  client: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    adress: string | null;
    type: string | null;
    typeNumber: string | null;
    image: string | null;
  } | null;
  recentSales: Array<{
    id: number;
    total: number;
    status: string;
    createdAt: string;
    invoices: { serie: string; nroCorrelativo: string } | null;
  }>;
  messageStats: { total: number; sent: number; received: number };
}

export default function ChatView({ remoteJid, isConnected, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(false);

  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScroll = useRef(true);

  const phoneNumber = formatPhoneNumber(remoteJid);

  // ── Load Messages ─────────────────────────────────────────────────────
  const loadMessages = useCallback(async (cursor?: number) => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', String(cursor));
      params.set('limit', '50');

      const encodedJid = encodeURIComponent(remoteJid);
      const res = await fetch(`/api/whatsapp/conversations/${encodedJid}/messages?${params}`);
      const data = await res.json();

      if (data.success) {
        const filtered = (data.messages || []).filter(
          (m: WAMessage) => !isHiddenMessage(m.content)
        );
        if (cursor) {
          setMessages((prev) => [...filtered, ...prev]);
        } else {
          setMessages(filtered);
        }
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [remoteJid]);

  // Initial load + mark as read
  useEffect(() => {
    setIsLoading(true);
    setMessages([]);
    loadMessages();

    // Mark as read
    const encodedJid = encodeURIComponent(remoteJid);
    fetch(`/api/whatsapp/conversations/${encodedJid}/read`, { method: 'POST' }).catch(() => {});

    // Clear unread in conversation list
    (window as any).__waConvList?.clearUnread(remoteJid);

    // Load contact info
    fetch(`/api/whatsapp/conversations/${encodedJid}/info`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setContactInfo(data);
      })
      .catch(() => {});
  }, [remoteJid, loadMessages]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Detect if user has scrolled up
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    shouldAutoScroll.current = isNearBottom;
  };

  // Load older messages
  const loadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const container = messagesContainerRef.current;
    const scrollBefore = container?.scrollHeight || 0;

    await loadMessages(nextCursor);

    // Preserve scroll position
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = container.scrollHeight - scrollBefore;
      }
    });
  };

  // ── Receive messages in real time (called from parent via window) ─────
  const addIncomingMessage = useCallback((msg: WAMessage) => {
    if (msg.remoteJid !== remoteJid) return;
    if (isHiddenMessage(msg.content)) return;

    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    // Mark as read since conversation is open
    const encodedJid = encodeURIComponent(remoteJid);
    fetch(`/api/whatsapp/conversations/${encodedJid}/read`, { method: 'POST' }).catch(() => {});
  }, [remoteJid]);

  // Expose addIncomingMessage
  useEffect(() => {
    (window as any).__waChatView = { addIncomingMessage, remoteJid };
    return () => { delete (window as any).__waChatView; };
  });

  // ── Send Text Message ─────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending || sendCooldown || !isConnected) return;

    setIsSending(true);
    setInputText('');

    // Optimistic add
    const optimisticMsg: WAMessage = {
      id: Date.now(),
      remoteJid,
      content: text,
      messageType: 'TEXT',
      isFromMe: true,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    shouldAutoScroll.current = true;

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phoneNumber, content: text }),
      });
      const data = await res.json();

      if (data.success) {
        // Replace optimistic message
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'SENT', id: data.messageId || m.id } : m))
        );
        (window as any).__waConvList?.updateConversation(remoteJid, text, 'TEXT', true);

        // 2s cooldown
        setSendCooldown(true);
        setTimeout(() => setSendCooldown(false), 2000);
      } else {
        setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'FAILED' } : m)));
        toast.error('Error al enviar mensaje', { description: data.error });
      }
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'FAILED' } : m)));
      toast.error('Error al enviar mensaje');
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // ── Send File (Image or Document) ─────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isConnected) return;
    e.target.value = ''; // Reset

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast.error('Solo se permiten imágenes y PDFs');
      return;
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5MB');
      return;
    }

    if (isPdf && file.size > 16 * 1024 * 1024) {
      toast.error('El PDF no puede superar 16MB');
      return;
    }

    setIsSending(true);

    // Optimistic
    const typeLabel = isImage ? 'IMAGE' : 'DOCUMENT';
    const contentLabel = isImage ? '[Imagen]' : `[Documento: ${file.name}]`;
    const optimisticMsg: WAMessage = {
      id: Date.now(),
      remoteJid,
      content: contentLabel,
      messageType: typeLabel,
      isFromMe: true,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    shouldAutoScroll.current = true;

    try {
      const formData = new FormData();
      formData.append('to', phoneNumber);

      if (isImage) {
        formData.append('image', file);
        const res = await fetch('/api/whatsapp/send-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'SENT' } : m)));
          (window as any).__waConvList?.updateConversation(remoteJid, contentLabel, typeLabel, true);
          setSendCooldown(true);
          setTimeout(() => setSendCooldown(false), 2000);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'FAILED' } : m)));
          toast.error('Error al enviar imagen');
        }
      } else {
        // PDF — use existing /api/whatsapp/send endpoint (send as document via backend)
        formData.append('document', file);
        formData.append('fileName', file.name);
        // For PDFs, use the regular send with content mentioning the file
        // The backend sendDocument endpoint isn't proxied with FormData yet,
        // so we'll send as a text message referencing the document
        setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'FAILED', content: 'Envío de PDFs disponible próximamente' } : m)));
        toast.info('Envío de PDFs desde el chat estará disponible próximamente');
      }
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, status: 'FAILED' } : m)));
      toast.error('Error al enviar archivo');
    } finally {
      setIsSending(false);
    }
  };

  // ── Key handling ──────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // ── Render ────────────────────────────────────────────────────────────
  const grouped = groupWhatsAppMessages(messages);
  const displayName = contactInfo?.client?.name || phoneNumber;
  const initial = getContactInitial(contactInfo?.client?.name, phoneNumber);

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 sm:px-4 py-2 sm:py-3 border-b flex-shrink-0 bg-background">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="cursor-pointer h-8 w-8 p-0 sm:hidden flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">{initial}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{phoneNumber}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInfo(!showInfo)}
          className="cursor-pointer h-8 w-8 p-0 flex-shrink-0"
        >
          {showInfo ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        </Button>
      </div>

      {/* Body: Chat + Info Panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Messages scroll */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-2 sm:py-3 min-h-0"
          >
            {/* Load more */}
            {hasMore && (
              <div className="text-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="cursor-pointer text-xs h-7"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  )}
                  Cargar anteriores
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No hay mensajes en esta conversación</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {grouped.map((msg) => (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {msg.showDateSeparator && (
                      <div className="flex items-center justify-center py-2 sm:py-3">
                        <span className="bg-muted px-3 py-0.5 rounded-full text-[10px] sm:text-xs text-muted-foreground">
                          {msg.showDateSeparator}
                        </span>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'} ${msg.isFirst ? 'mt-2' : 'mt-0.5'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] px-2.5 sm:px-3 py-1.5 sm:py-2 break-words ${
                          msg.isFromMe
                            ? 'bg-primary text-primary-foreground rounded-l-lg rounded-tr-lg' + (msg.isFirst ? ' rounded-tr-lg' : '')
                            : 'bg-muted rounded-r-lg rounded-tl-lg' + (msg.isFirst ? ' rounded-tl-lg' : '')
                        } ${msg.isFirst ? (msg.isFromMe ? 'rounded-br-sm' : 'rounded-bl-sm') : (msg.isFromMe ? 'rounded-r-lg' : 'rounded-l-lg')}`}
                      >
                        {/* Media type indicator */}
                        {msg.messageType !== 'TEXT' && (
                          <div className={`flex items-center gap-1 text-[10px] mb-0.5 ${msg.isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {msg.messageType === 'IMAGE' && <><ImageIcon className="h-3 w-3" /> Imagen</>}
                            {msg.messageType === 'VIDEO' && <><Video className="h-3 w-3" /> Video</>}
                            {msg.messageType === 'AUDIO' && <><Mic className="h-3 w-3" /> Audio</>}
                            {msg.messageType === 'DOCUMENT' && <><FileText className="h-3 w-3" /> Documento</>}
                          </div>
                        )}

                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.content}</p>

                        {/* Time + status */}
                        {msg.isLast && (
                          <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.isFromMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            <span className="text-[9px] sm:text-[10px]">
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </span>
                            {msg.isFromMe && (
                              <span className="text-[9px]">
                                {msg.status === 'SENT' && '✓'}
                                {msg.status === 'DELIVERED' && '✓✓'}
                                {msg.status === 'READ' && '✓✓'}
                                {msg.status === 'PENDING' && '⏳'}
                                {msg.status === 'FAILED' && '✗'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t px-2 sm:px-3 py-2 flex items-end gap-1.5 sm:gap-2 flex-shrink-0 bg-background">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected || isSending}
              className="cursor-pointer h-8 w-8 p-0 flex-shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Escribe un mensaje...' : 'WhatsApp desconectado'}
              disabled={!isConnected}
              rows={1}
              className="flex-1 min-w-0 resize-none rounded-lg border px-3 py-1.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring max-h-[120px]"
            />

            <Button
              size="sm"
              onClick={handleSend}
              disabled={!inputText.trim() || isSending || sendCooldown || !isConnected}
              className="cursor-pointer h-8 w-8 p-0 flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Info Panel (desktop only) */}
        {showInfo && contactInfo && (
          <div className="hidden sm:flex flex-col w-64 lg:w-72 border-l overflow-y-auto bg-background flex-shrink-0">
            <div className="p-4 space-y-4">
              {/* Contact header */}
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-semibold text-primary">{initial}</span>
                </div>
                <p className="font-medium text-sm">{contactInfo.client?.name || phoneNumber}</p>
                <p className="text-xs text-muted-foreground">{phoneNumber}</p>
                {contactInfo.client?.email && (
                  <p className="text-xs text-muted-foreground">{contactInfo.client.email}</p>
                )}
              </div>

              {/* Client info */}
              {contactInfo.client && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Cliente
                  </p>
                  <div className="bg-muted/50 rounded-lg p-2.5 text-xs space-y-1">
                    {contactInfo.client.type && <p>Tipo: {contactInfo.client.type}</p>}
                    {contactInfo.client.typeNumber && <p>{contactInfo.client.type === 'RUC' ? 'RUC' : 'DNI'}: {contactInfo.client.typeNumber}</p>}
                    {contactInfo.client.adress && <p className="break-words">Dir: {contactInfo.client.adress}</p>}
                  </div>
                </div>
              )}

              {/* Message stats */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Mensajes</p>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-sm font-semibold">{contactInfo.messageStats.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-sm font-semibold">{contactInfo.messageStats.sent}</p>
                    <p className="text-[10px] text-muted-foreground">Enviados</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-sm font-semibold">{contactInfo.messageStats.received}</p>
                    <p className="text-[10px] text-muted-foreground">Recibidos</p>
                  </div>
                </div>
              </div>

              {/* Recent sales */}
              {contactInfo.recentSales.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="h-3.5 w-3.5" /> Últimas ventas
                  </p>
                  <div className="space-y-1.5">
                    {contactInfo.recentSales.map((sale) => (
                      <div key={sale.id} className="bg-muted/50 rounded p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {sale.invoices
                              ? `${sale.invoices.serie}-${sale.invoices.nroCorrelativo}`
                              : `#${sale.id}`}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {sale.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-0.5 text-muted-foreground">
                          <span>{format(new Date(sale.createdAt), 'dd/MM/yy', { locale: es })}</span>
                          <span className="font-medium text-foreground">
                            S/ {Number(sale.total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
