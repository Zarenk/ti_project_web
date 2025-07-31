"use client"

import { useState, useEffect, useRef } from "react";
import socket from "@/lib/utils";

interface Message {
  userId: number;
  text: string;
  createdAt: string;
}

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      socket.emit("chat:send", { userId: 1, text });
      setText("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-24 right-6 z-50 w-80 max-h-[60vh] flex flex-col bg-white rounded-md shadow-lg border">
      <div className="p-2 border-b flex justify-between items-center">
        <span className="font-semibold">Chat</span>
        <button onClick={onClose} className="text-sm">×</button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.map((m, idx) => (
          <div key={idx} className="text-sm">
            <span className="text-gray-500 text-xs mr-1">
              {new Date(m.createdAt).toLocaleTimeString()}
            </span>
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="p-2 border-t flex"
      >
        <input
          className="flex-1 border rounded-l-md px-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje"
        />
        <button type="submit" className="bg-blue-500 text-white px-3 rounded-r-md text-sm">Enviar</button>
      </form>
    </div>
  );
}