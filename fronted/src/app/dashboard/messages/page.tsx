"use client";

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { sendMessage, getClients, getMessages } from './messages.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, Eye, X, Filter, ArrowUpDown } from 'lucide-react';
import socket, { cn } from '@/lib/utils';
import TypingIndicator from '@/components/TypingIndicator';
import { useMessages } from '@/context/messages-context';

interface Message {
  id: number;
  clientId: number;
  senderId: number;
  text: string;
  createdAt: string;
  seenAt?: string | null;
}

export default function Page() {
  const { userId, userName } = useAuth();
  const { pendingCounts, setPendingCounts } = useMessages();
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<number, Message | null>>({});
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [sortByName, setSortByName] = useState(false);
  const [clientTyping, setClientTyping] = useState(false);

  const displayName = (c: any) =>
    c.name && c.name.trim() !== '' ? c.name : `Invitado #${c.userId}`;

  useEffect(() => {
    const receiveHandler = (msg: Message) => {
      if (msg.clientId !== selected) {
        setPendingCounts((prev) => ({
          ...prev,
          [msg.clientId]: (prev[msg.clientId] ?? 0) + 1,
        }));
      }
    };
    const seenHandler = ({ clientId }: any) => {
      setPendingCounts((prev) =>
        prev[clientId] ? { ...prev, [clientId]: 0 } : prev,
      );
    };
    socket.on('chat:receive', receiveHandler);
    socket.on('chat:seen', seenHandler);
    return () => {
      socket.off('chat:receive', receiveHandler);
      socket.off('chat:seen', seenHandler);
    };
  }, [selected, setPendingCounts]);

  useEffect(() => {
    const load = async () => {
      try {
        const allClients = await getClients();
        setClients(allClients);

        const lastEntries = await Promise.all(
          allClients.map(async (c: any) => {
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
    setPendingCounts((prev) => ({ ...prev, [selected]: 0 }));
    setClientTyping(false);

    const receiveHandler = (msg: Message) => {
      if (msg.clientId === selected) {
        setHistory((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
      }
    };
    const historyHandler = (msgs: Message[]) => {
      setHistory(msgs); // Replace history with server response
    };
    const seenHandler = ({ clientId, viewerId, seenAt }: any) => {
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

    const typingHandler = ({ clientId, senderId, isTyping }: any) => {
      if (clientId === selected && senderId !== userId) {
        setClientTyping(isTyping);
      }
    };

    socket.emit('chat:history', { clientId: selected });
    socket.emit('chat:seen', { clientId: selected, viewerId: userId });
    socket.on('chat:receive', receiveHandler);
    socket.on('chat:history', historyHandler);
    socket.on('chat:seen', seenHandler);
    socket.on('chat:typing', typingHandler);

    return () => {
      socket.off('chat:receive', receiveHandler);
      socket.off('chat:history', historyHandler);
      socket.off('chat:seen', seenHandler);
      socket.off('chat:typing', typingHandler);
    };
  }, [selected]);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = async () => {
    if (!userId || selected === null || !text.trim()) return;
    try {
      const msg = await sendMessage({
        clientId: selected,
        senderId: userId,
        text,
      });
      setHistory((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      setText('');
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClients = clients
    .filter((c: any) =>
      displayName(c).toLowerCase().includes(search.toLowerCase()),
    )
    .filter(
      (c: any) => !showPendingOnly || (pendingCounts[c.userId] ?? 0) > 0,
    )
    .sort((a: any, b: any) =>
      sortByName
        ? displayName(a).localeCompare(displayName(b))
        : (pendingCounts[b.userId] ?? 0) - (pendingCounts[a.userId] ?? 0),
    );
  const clientMap = new Map(
    clients.map((c: any) => [c.userId, displayName(c)]),
  );
  const clientInfo = clients.find((c: any) => c.userId === selected);
  const isActive = clientInfo?.status === 'Activo';

  return (
    <section className="p-4 space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-2xl font-bold">Mensajes</h1>
      <div className="flex flex-1 flex-col md:flex-row gap-4 overflow-hidden">
        <Card className="w-full md:w-1/3 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conversaciones</h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Filtrar"
                onClick={() => setShowPendingOnly((p) => !p)}
                className="hover:bg-blue-100 hover:text-blue-600"
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ordenar"
                onClick={() => setSortByName((p) => !p)}
                className="hover:bg-blue-100 hover:text-blue-600"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 border-b">
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="flex-1 overflow-y-auto divide-y">
            {filteredClients.map((c: any) => (
              <li key={c.userId}>
                <button
                  onClick={() => setSelected(c.userId)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-transform bg-gradient-to-r from-background to-muted hover:shadow-md hover:scale-105',
                    selected === c.userId && 'from-primary/10 to-primary/5'
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={c.image || '/placeholder.svg'}
                        alt={displayName(c)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{displayName(c)}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                          {lastMessages[c.userId]?.text || 'Sin mensajes'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {lastMessages[c.userId]?.createdAt
                          ? new Date(lastMessages[c.userId]!.createdAt).toLocaleTimeString()
                          : ''}
                      </span>
                      {pendingCounts[c.userId] > 0 && (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {pendingCounts[c.userId]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
          {selected === null ? (
            <Card className="h-96 flex items-center justify-center p-4">
              <p className="text-muted-foreground">
                Selecciona un cliente para ver la conversación.
              </p>
            </Card>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
              <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-gradient-to-r from-primary/80 to-primary text-primary-foreground shadow-sm">
                <div className="flex items-center gap-3">
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
                    onClick={() => setSelected(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'max-w-[80%]',
                      m.senderId === userId ? 'ml-auto text-right' : 'mr-auto'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg p-2',
                        m.senderId === userId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-xs mb-1">
                        <span className="font-medium">
                          {m.senderId === userId
                            ? userName || 'Tú'
                            : clientMap.get(m.clientId) || 'Usuario'}
                        </span>{' '}
                        <span className="text-muted-foreground">
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </span>
                      </p>
                      <p>{m.text}</p>
                      {m.senderId === userId && m.seenAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Visto {new Date(m.seenAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {clientTyping && (
                  <TypingIndicator
                    name={clientMap.get(selected!) || 'Usuario'}
                  />
                )}
                <div ref={bottomRef} />
              </div>
              <div className="p-4 border-t flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend}>Enviar</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
