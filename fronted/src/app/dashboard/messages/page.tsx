"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getClients, getMessages } from './messages.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, X, Paperclip, ArrowLeft, MessageSquare, ChevronUp, Loader2 } from 'lucide-react';
import ClientList from './client-list';
import socket, { cn } from '@/lib/utils';
import TypingIndicator from '@/components/TypingIndicator';
import { useMessages } from '@/context/messages-context';
import EditableMessage from './EditableMessage';
import { groupMessages } from '@/lib/chat-utils';
import { toast } from 'sonner';
import { PageGuideButton } from "@/components/page-guide-dialog";
import { MESSAGES_GUIDE_STEPS } from "./messages-guide-steps";

interface Message {
  id: number;
  clientId: number;
  senderId: number;
  text: string;
  createdAt: string;
  seenAt?: string | null;
  file?: string;
  tempId?: number;
}

interface ChatClient {
  userId: number;
  name?: string | null;
  image?: string | null;
  status?: string | null;
}

interface SeenPayload {
  clientId: number;
  viewerId: number;
  seenAt: string;
}

interface TypingPayload {
  clientId: number;
  senderId: number;
  isTyping: boolean;
}

interface UpdatePayload {
  id: number;
  text: string;
}

interface DeletePayload {
  id: number;
}

export default function Page() {
  const { userId, userName } = useAuth();
  const { pendingCounts, setPendingCounts } = useMessages();
  const [clients, setClients] = useState<ChatClient[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<number, Message | null>>({});
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [sortByName, setSortByName] = useState(false);
  const [clientTyping, setClientTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef(0);
  const isLoadingOlderRef = useRef(false);
  const pendingTempIds = useRef<Set<number>>(new Set());
  const historyLoadedRef = useRef(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const clearFile = () => {
    setPreview(null);
  };


  const displayName = useCallback(
    (c: ChatClient) =>
      c.name && c.name.trim() !== '' ? c.name : `Invitado #${c.userId}`,
    [],
  );

  useEffect(() => {
    const receiveHandler = (msg: Message) => {
      setLastMessages((prev) => ({ ...prev, [msg.clientId]: msg }));
      if (msg.clientId !== selected) {
        setPendingCounts((prev) => ({
          ...prev,
          [msg.clientId]: (prev[msg.clientId] ?? 0) + 1,
        }));
      }
    };
    const seenHandler = ({ clientId }: Pick<SeenPayload, 'clientId'>) => {
      setPendingCounts((prev) =>
        prev[clientId] ? { ...prev, [clientId]: 0 } : prev,
      );
    };
    const errorHandler = (payload: { message?: string }) => {
      toast.error(payload?.message || 'Error en tiempo real de chat.');
    };
    socket.on('chat:receive', receiveHandler);
    socket.on('chat:seen', seenHandler);
    socket.on('chat:error', errorHandler);
    return () => {
      socket.off('chat:receive', receiveHandler);
      socket.off('chat:seen', seenHandler);
      socket.off('chat:error', errorHandler);
    };
  }, [selected, setPendingCounts]);

  useEffect(() => {
    const load = async () => {
      try {
        const allClients = (await getClients()) as ChatClient[];
        setClients(allClients);

        const lastEntries = await Promise.all(
          allClients.map(async (c) => {
            const msgs = await getMessages(c.userId);
            return [c.userId, msgs[msgs.length - 1] ?? null] as const;
          })
        );
        setLastMessages(Object.fromEntries(lastEntries));

      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selected === null) return;

    setHistory([]); // Reset history when switching clients
    setHasMore(false);
    setLoadingOlder(false);
    isLoadingOlderRef.current = false;
    historyLoadedRef.current = false;
    pendingTempIds.current.clear();
    setPendingCounts((prev) => ({ ...prev, [selected]: 0 }));
    setClientTyping(false);

    const receiveHandler = (msg: Message) => {
      if (msg.clientId === selected) {
        // Reconcile optimistic message via tempId
        if (msg.tempId && pendingTempIds.current.has(msg.tempId)) {
          pendingTempIds.current.delete(msg.tempId);
          setHistory((prev) =>
            prev.map((m) => (m.tempId === msg.tempId ? { ...msg } : m)),
          );
        } else {
          setHistory((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
        }
      }
    };
    const historyHandler = (
      data: Message[] | { messages: Message[]; hasMore: boolean },
    ) => {
      // Guard: only accept the first history response per selection
      // to prevent stale responses from overwriting recently sent messages
      if (historyLoadedRef.current) return;
      historyLoadedRef.current = true;
      if (Array.isArray(data)) {
        setHistory(data);
        setHasMore(false);
      } else {
        setHistory(data.messages);
        setHasMore(data.hasMore);
      }
    };
    const olderHandler = (data: { messages: Message[]; hasMore: boolean }) => {
      isLoadingOlderRef.current = true;
      setHistory((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setLoadingOlder(false);
    };
    const seenHandler = ({ clientId, viewerId, seenAt }: SeenPayload) => {
      if (clientId !== selected) return;
      if (viewerId === userId) {
        setHistory((prev) =>
          prev.map((m) =>
            m.senderId !== userId && !m.seenAt ? { ...m, seenAt } : m
          ),
        );
      } else {
        setHistory((prev) =>
          prev.map((m) =>
            m.senderId === userId && !m.seenAt ? { ...m, seenAt } : m
          ),
        );
      }
    };

    const typingHandler = ({ clientId, senderId, isTyping }: TypingPayload) => {
      if (clientId === selected && senderId !== userId) {
        setClientTyping(isTyping);
      }
    };

    const updateHandler = ({ id, text }: UpdatePayload) => {
      setHistory((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text } : m)),
      );
    };

    const deleteHandler = ({ id }: DeletePayload) => {
      setHistory((prev) => prev.filter((m) => m.id !== id));
    };
    const errorHandler = (payload: { message?: string }) => {
      toast.error(payload?.message || 'Error en tiempo real de chat.');
    };

    socket.emit('chat:history', { clientId: selected, limit: 50 });
    socket.emit('chat:seen', { clientId: selected, viewerId: userId });
    socket.on('chat:receive', receiveHandler);
    socket.on('chat:history', historyHandler);
    socket.on('chat:history:older', olderHandler);
    socket.on('chat:seen', seenHandler);
    socket.on('chat:typing', typingHandler);
    socket.on('chat:error', errorHandler);
    socket.on('chat:updated', updateHandler);
    socket.on('chat:deleted', deleteHandler);

    return () => {
      socket.off('chat:receive', receiveHandler);
      socket.off('chat:history', historyHandler);
      socket.off('chat:history:older', olderHandler);
      socket.off('chat:seen', seenHandler);
      socket.off('chat:typing', typingHandler);
      socket.off('chat:error', errorHandler);
      socket.off('chat:updated', updateHandler);
      socket.off('chat:deleted', deleteHandler);
    };
  }, [selected, setPendingCounts, userId]);

  useEffect(() => {
    if (selected === null) return;
    socket.emit('chat:typing', {
      clientId: selected,
      senderId: userId,
      isTyping: text.length > 0,
    });
    return () => {
      socket.emit('chat:typing', {
        clientId: selected,
        senderId: userId,
        isTyping: false,
      });
    };
  }, [text, selected, userId]);

  useLayoutEffect(() => {
    if (isLoadingOlderRef.current) {
      isLoadingOlderRef.current = false;
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop =
          container.scrollHeight - prevScrollHeightRef.current;
      }
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleEditMessage = (id: number, newText: string) => {
    setHistory((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: newText } : m)),
    );
  };

  const handleLoadMore = useCallback(() => {
    if (!selected || !hasMore || loadingOlder || history.length === 0) return;
    const container = scrollContainerRef.current;
    if (container) {
      prevScrollHeightRef.current = container.scrollHeight;
    }
    setLoadingOlder(true);
    socket.emit('chat:history', {
      clientId: selected,
      limit: 50,
      beforeId: history[0].id,
    });
  }, [selected, hasMore, loadingOlder, history]);

  const handleSend = () => {
    if (!userId || selected === null || (!text.trim() && !preview)) return;
    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      tempId,
      clientId: selected,
      senderId: userId,
      text,
      createdAt: new Date().toISOString(),
      file: preview || undefined,
    };
    setHistory((prev) => [...prev, optimistic]);
    pendingTempIds.current.add(tempId);
    setLastMessages((prev) => ({ ...prev, [selected]: optimistic }));
    socket.emit('chat:send', {
      clientId: selected,
      senderId: userId,
      text,
      tempId,
      ...(preview ? { file: preview } : {}),
    });
    setText('');
    setPreview(null);
  };

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.userId, displayName(c)])),
    [clients, displayName],
  );
  const clientInfo = useMemo(
    () => clients.find((c) => c.userId === selected),
    [clients, selected],
  );
  const isActive = clientInfo?.status === 'Activo';
  const groupedHistory = useMemo(() => groupMessages(history), [history]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileList(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClientSelect = useCallback(
    (id: number) => {
      setSelected(id);
      if (isMobile) {
        setShowMobileList(false);
      }
    },
    [isMobile],
  );

  const handleClearSelection = useCallback(() => {
    setSelected(null);
    if (isMobile) {
      setShowMobileList(true);
    }
  }, [isMobile]);

  const chatContainerClasses = useMemo(
    () =>
      cn(
        'flex-1 h-full min-h-0 overflow-hidden md:flex md:flex-col',
        isMobile ? 'flex flex-col' : '',
        isMobile && showMobileList ? 'hidden' : '',
      ),
    [isMobile, showMobileList],
  );

  return (
    <section className="p-4 space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Mensajes</h1>
          <PageGuideButton steps={MESSAGES_GUIDE_STEPS} tooltipLabel="Guía de mensajes" />
        </div>
        {isMobile && !showMobileList && (
          <Button variant="outline" size="sm" onClick={() => setShowMobileList(true)}>
            Conversaciones
          </Button>
        )}
      </div>
      <div className="flex flex-1 flex-col md:flex-row gap-4 overflow-hidden">
        {showMobileList && (
          <div className="flex flex-col md:w-80 md:flex-shrink-0">
            <ClientList
              clients={clients}
              selected={selected}
              setSelected={handleClientSelect}
              displayName={displayName}
              lastMessages={lastMessages}
              pendingCounts={pendingCounts}
              search={search}
              setSearch={setSearch}
              showPendingOnly={showPendingOnly}
              setShowPendingOnly={setShowPendingOnly}
              sortByName={sortByName}
              setSortByName={setSortByName}
            />
          </div>
        )}
        <div className={chatContainerClasses}>
          {selected === null ? (
            <Card className="h-full flex flex-col items-center justify-center gap-3 p-6">
              <div className="rounded-full bg-muted p-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Selecciona una conversación</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Elige un cliente de la lista para ver los mensajes.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
                <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-gradient-to-r from-primary/80 to-primary text-primary-foreground shadow-sm">
                  <div className="flex items-center gap-3">
                    {isMobile && !showMobileList && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-primary-foreground"
                        onClick={() => setShowMobileList(true)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Avatar className="h-10 w-10">
                      {clientInfo?.image ? (
                        <AvatarImage src={clientInfo.image} />
                      ) : (
                        <AvatarFallback>
                        {clientMap.get(selected)?.[0] || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-primary-foreground">
                      {clientMap.get(selected) || 'Usuario'}
                    </span>
                    <span
                      className={cn(
                        'text-xs flex items-center',
                        isActive ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      <span
                        className={cn(
                          'mr-1 h-2 w-2 rounded-full',
                          isActive ? 'bg-green-500' : 'bg-red-500'
                        )}
                      />
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="bg-white text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      /* TODO: implement view profile navigation */
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={handleClearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </header>
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-2 bg-slate-50/50 dark:bg-slate-950/30">
                {hasMore && (
                  <div className="flex justify-center py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingOlder}
                      className="text-xs text-muted-foreground gap-1.5 cursor-pointer"
                    >
                      {loadingOlder ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      )}
                      {loadingOlder ? 'Cargando...' : 'Cargar mensajes anteriores'}
                    </Button>
                  </div>
                )}
                {groupedHistory.map((m) => (
                  <Fragment key={m.tempId ?? m.id}>
                    {m.showDateSeparator && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-muted-foreground font-medium bg-background px-2.5 py-0.5 rounded-full shadow-sm border">
                          {m.showDateSeparator}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <EditableMessage
                      message={m}
                      isSender={m.senderId === userId}
                      userId={userId!}
                      displayName={
                        m.senderId === userId
                          ? userName || 'Tú'
                          : clientMap.get(m.clientId) || 'Usuario'
                      }
                      avatarUrl={
                        m.senderId !== userId
                          ? clientInfo?.image || undefined
                          : undefined
                      }
                      onEdit={handleEditMessage}
                      isFirst={m.isFirst}
                      isLast={m.isLast}
                    />
                  </Fragment>
                ))}
                {clientTyping && (
                  <TypingIndicator
                    name={clientMap.get(selected!) || 'Usuario'}
                  />
                )}
                <div ref={bottomRef} />
              </div>
              <div className="p-4 border-t flex flex-col gap-2">
                {preview && (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Previsualización"
                      className="max-h-24 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive text-white p-0.5"
                      aria-label="Eliminar adjunto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    id="message-file"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="message-file"
                    className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center"
                  >
                    <Paperclip className="h-5 w-5" />
                  </label>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <Button onClick={handleSend}>Enviar</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
