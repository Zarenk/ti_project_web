"use client"

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { X, Send, Paperclip } from 'lucide-react';
import { motion } from 'framer-motion'; 
import socket from '@/lib/utils';
import TypingIndicator from './TypingIndicator';
import { useChatUserId } from '@/hooks/use-chat-user-id';
import MessagesList from './MessageList';
import { toast } from 'sonner';

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

interface SendPayload {
  clientId: number;
  senderId: number;
  text: string;
  tempId: number;
  file?: string;
}

interface ChatPanelProps {
  onClose: () => void;
  userId?: number;
}

export default function ChatPanel({
  onClose,
  userId: propUserId,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hookUserId = useChatUserId();
  const userId = propUserId ?? hookUserId;
  const [agentTyping, setAgentTyping] = useState(false);
  const pendingTempIds = useRef<Set<number>>(new Set());
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const receiveHandler = (msg: Message) => {
      if (msg.clientId === userId) {
        if (msg.tempId && pendingTempIds.current.has(msg.tempId)) {
          pendingTempIds.current.delete(msg.tempId);
          setMessages((prev) =>
            prev.map((m) => (m.tempId === msg.tempId ? { ...msg } : m))
          );
        } else {
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        }
      }
    };

    const historyHandler = (history: Message[]) => {
      const chatHistory = history.filter((m) => m.clientId === userId);
      if (chatHistory.length === 0) {
        const welcome: Message = {
          id: Date.now(),
          clientId: userId,
          senderId: 0,
          text: 'Bienvenido al chat de Tecnología Informática EIRL. Un asesor te responderá en breve. Por favor, mantén la cordialidad y proporciona detalles de tu consulta para ofrecerte una atención eficiente.',
          createdAt: new Date().toISOString(),
        };
        setMessages([welcome]);
      } else {
        setMessages(chatHistory);
      }
    };

    const seenHandler = ({ clientId, viewerId, seenAt }: SeenPayload) => {
      if (clientId !== userId) return;
      if (viewerId === userId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId !== userId && !m.seenAt ? { ...m, seenAt } : m,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === userId && !m.seenAt ? { ...m, seenAt } : m,
          ),
        );
      }
    };

    socket.emit('chat:history', { clientId: userId });
    socket.emit('chat:seen', { clientId: userId, viewerId: userId });
    socket.on('chat:receive', receiveHandler);
    socket.on('chat:history', historyHandler);
    socket.on('chat:seen', seenHandler);
    const typingHandler = ({ clientId, senderId, isTyping }: TypingPayload) => {
      if (clientId === userId && senderId !== userId) {
        setAgentTyping(isTyping);
      }
    };
    const updateHandler = ({ id, text }: UpdatePayload) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, text } : m)),
      );
    };
    const deleteHandler = ({ id }: DeletePayload) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    };
    const rateLimitHandler = () => {
      setRateLimited(true);
      toast.error('Has excedido el limite de mensajes. Intenta nuevamente en unos segundos.');
      setTimeout(() => setRateLimited(false), 10_000);
    };
    const errorHandler = (payload: { message?: string }) => {
      toast.error(payload?.message || 'Error en tiempo real de chat.');
    };
    socket.on('chat:typing', typingHandler);
    socket.on('chat:rate-limit', rateLimitHandler);
    socket.on('chat:error', errorHandler);
    socket.on('chat:updated', updateHandler);
    socket.on('chat:deleted', deleteHandler);
    return () => {
      socket.off('chat:receive', receiveHandler);
      socket.off('chat:history', historyHandler);
      socket.off('chat:seen', seenHandler);
      socket.off('chat:typing', typingHandler);
      socket.off('chat:rate-limit', rateLimitHandler);
      socket.off('chat:error', errorHandler);
      socket.off('chat:updated', updateHandler);
      socket.off('chat:deleted', deleteHandler);
    };
  }, [userId]);

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      socket.emit('chat:typing', {
        clientId: userId,
        senderId: userId,
        isTyping: text.length > 0,
      });
    }, 300);

    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }     
    };
  }, [text, userId]);

  useEffect(() => {
    return () => {
      if (userId) {
        socket.emit('chat:typing', {
          clientId: userId,
          senderId: userId,
          isTyping: false,
        });
      }
    };
  }, [userId]);

  const send = () => {
    if (rateLimited || !userId) return;
    if (text.trim() || preview) { 
      const tempId = Date.now();
      const newMessage: Message = {
        id: tempId,
        tempId,
        clientId: userId,
        senderId: userId,
        text,
        createdAt: new Date().toISOString(),
        file: preview || undefined,
      };
      setMessages((prev) => [...prev, newMessage]);
      pendingTempIds.current.add(tempId);
      const payload: SendPayload = {
        clientId: userId,
        senderId: userId,
        text,
        tempId,
      };
      if (preview) {
        payload.file = preview;
      }
      socket.emit('chat:send', payload);
      setText('');
      setPreview(null);
    }
  };

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEdit = (id: number, newText: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text: newText } : m)),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 right-6 z-50"
    >
      <Card className="w-96 h-[600px] flex flex-col shadow-lg overflow-hidden">
        <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/ti_logo_final_blanco.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
            <h3 className="text-lg font-semibold">Chat en línea</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar chat">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-background">
          <MessagesList
            messages={messages}
            userId={userId!}
            onEdit={handleEdit}
          />
          {agentTyping && <TypingIndicator name="Asesor" />}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-4 border-t flex flex-col gap-2 bg-background"
        >
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
          <div className="flex items-center gap-2">
            <input
              id="chat-file"
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="chat-file"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </label>
            <Textarea
              placeholder="Escribe tu mensaje..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="flex-1"
              aria-label="Escribe tu mensaje"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-primary hover:bg-primary/90"
              aria-label="Enviar mensaje"
              disabled={rateLimited}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}

