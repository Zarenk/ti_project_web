"use client"

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send } from "lucide-react";
import socket, { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

interface Message {
  userId: number;
  text: string;
  createdAt: string;
}

interface ChatPanelProps {
  onClose: () => void;
  userId?: number;
}

export default function ChatPanel({ onClose, userId: propUserId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userId: contextUserId } = useAuth();
  const userId = propUserId ?? contextUserId ?? 1;

  useEffect(() => {
    socket.on("chat:receive", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on("chat:history", (history: Message[]) => {
      setMessages(history);
    });
    return () => {
      socket.off("chat:receive");
      socket.off("chat:history");
    };
  }, []);

  const send = () => {
    if (text.trim()) {
      socket.emit("chat:send", { userId, text });
      setText("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-36 right-6 z-50">
      <Card className="w-80 h-[400px] flex flex-col shadow-lg overflow-hidden">
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
        <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-white">
          {messages.map((m, idx) => (
            <div key={idx} className={cn("flex", m.userId === userId ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "p-2 rounded-lg max-w-[80%]",
                  m.userId === userId ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800"
                )}
              >
                <p>{m.text}</p>
                <span className="block mt-1 text-[10px] opacity-70">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-4 border-t flex items-center gap-2 bg-white"
        >
          <Input
            placeholder="Escribe tu mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1"
            aria-label="Escribe tu mensaje"
          />
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white" aria-label="Enviar mensaje">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}