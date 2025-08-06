"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getUnansweredMessages, sendMessage, getClients } from './messages.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import socket, { cn } from '@/lib/utils';

interface Message {
  id: number;
  clientId: number;
  senderId: number;
  text: string;
  createdAt: string;
}

export default function Page() {
  const { userId, userName } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [pendingCounts, setPendingCounts] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [pendingMsgs, allClients] = await Promise.all([
          getUnansweredMessages(),
          getClients(),
        ]);
        const counts = Object.fromEntries(
          pendingMsgs.map((m: any) => [m.clientId, m.count])
        );
        setPendingCounts(counts);
        setClients(allClients);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (selected === null) return;

    setHistory([]); // Reset history when switching clients

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

    socket.emit('chat:history', { clientId: selected });
    socket.on('chat:receive', receiveHandler);
    socket.on('chat:history', historyHandler);

    return () => {
      socket.off('chat:receive', receiveHandler);
      socket.off('chat:history', historyHandler);
    };
  }, [selected]);

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
    .filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort(
      (a: any, b: any) =>
        (pendingCounts[b.id] ?? 0) - (pendingCounts[a.id] ?? 0)
    );
  const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

  return (
    <section className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Mensajes</h1>
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="w-full md:w-1/3 flex flex-col">
          <div className="p-4 border-b">
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="flex-1 overflow-y-auto divide-y">
            {filteredClients.map((c: any) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    'w-full px-4 py-2 text-left hover:bg-muted',
                    selected === c.id && 'bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{c.name}</span>
                    {pendingCounts[c.id] > 0 && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {pendingCounts[c.id]}
                      </Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex-1">
          {selected === null ? (
            <Card className="h-96 flex items-center justify-center p-4">
              <p className="text-muted-foreground">
                Selecciona un cliente para ver la conversación.
              </p>
            </Card>
          ) : (
            <Card className="h-96 flex flex-col">
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
                    </div>
                  </div>
                ))}
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
