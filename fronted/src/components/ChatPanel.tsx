"use client"

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Send, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import socket from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface Message {
  id: number;
  clientId: number;
  senderId: number;
  text: string;
  createdAt: string;
  seenAt?: string | null;
  file?: string;
}

interface ChatPanelProps {
  onClose: () => void;
  userId?: number;
}

export default function ChatPanel({ onClose, userId: propUserId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userId: contextUserId } = useAuth();
  const userId = propUserId ?? contextUserId ?? 1;

  useEffect(() => {
    const receiveHandler = (msg: Message) => {
      if (msg.clientId === userId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const historyHandler = (history: Message[]) => {
      const chatHistory = history.filter((m) => m.clientId === userId);
      if (chatHistory.length === 0) {
        const welcome: Message = {
          id: Date.now(),
          clientId: userId,
          senderId: 0,
          text: "Bienvenido al chat de Tecnología Informática EIRL. Un asesor te responderá en breve. Por favor, mantén la cordialidad y proporciona detalles de tu consulta para ofrecerte una atención eficiente.",
          createdAt: new Date().toISOString(),
        };
        setMessages([welcome]);
      } else {
        setMessages(chatHistory);
      }
    };

    const seenHandler = ({ clientId, viewerId, seenAt }: any) => {
      if (clientId !== userId) return;
      if (viewerId === userId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId !== userId && !m.seenAt ? { ...m, seenAt } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === userId && !m.seenAt ? { ...m, seenAt } : m
          )
        );
      }
    };

    socket.emit("chat:history", { clientId: userId });
    socket.emit("chat:seen", { clientId: userId, viewerId: userId });
    socket.on("chat:receive", receiveHandler);
    socket.on("chat:history", historyHandler);
    socket.on("chat:seen", seenHandler);
    return () => {
      socket.off("chat:receive", receiveHandler);
      socket.off("chat:history", historyHandler);
      socket.off("chat:seen", seenHandler);
    };
  }, [userId]);

  const send = () => {
    if (text.trim() || preview) {
      socket.emit("chat:send", {
        clientId: userId,
        senderId: userId,
        text,
        file: preview,
      });
      setText("");
      setFile(null);
      setPreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 right-6 z-50"
    >
      <Card className="w-96 h-[500px] flex flex-col shadow-lg overflow-hidden">
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
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                text={m.text}
                time={m.createdAt}
                isSender={m.senderId === userId}
              />
            ))}
          </AnimatePresence>
          {text && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-4 border-t flex flex-col gap-2 bg-background"
        >
          <Input
            placeholder="Escribe tu mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1"
            aria-label="Escribe tu mensaje"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md"
            aria-label="Enviar mensaje"
          >
            <Send className="h-4 w-4" />
          </motion.button>
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
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}