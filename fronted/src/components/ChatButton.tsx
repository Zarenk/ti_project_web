"use client"

import { useState, useEffect } from "react";
import Image from "next/image";
import { MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatPanel from "./ChatPanel";
import socket from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";

interface Message {
  userId: number;
  text: string;
  createdAt: string;
}

export default function ChatButton() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();
  const { role } = useAuth();
  const [unread, setUnread] = useState(0);
  const { userId: contextUserId } = useAuth();
  const userId = contextUserId ?? 1;

  if (pathname.startsWith("/dashboard") || role !== "CLIENT") {
    return null;
  }

  useEffect(() => {
    const handleReceive = (msg: Message) => {
      if (msg.userId === userId && !open) {
        setUnread((prev) => prev + 1);
      }
    };
    const handleHistory = (history: Message[]) => {
      if (!open) {
        const lastRead = Number(localStorage.getItem("chatLastRead") || 0);
        const count = history.filter(
          (m) => m.userId === userId && new Date(m.createdAt).getTime() > lastRead
        ).length;
        setUnread(count);
      }
    };

    socket.emit("chat:history", { userId });
    socket.on("chat:receive", handleReceive);
    socket.on("chat:history", handleHistory);
    return () => {
      socket.off("chat:receive", handleReceive);
      socket.off("chat:history", handleHistory);
    };
  }, [userId, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      localStorage.setItem("chatLastRead", Date.now().toString());
    }
  }, [open]);

  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-22 right-6 z-60"
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="group relative block"
        >
          <AnimatePresence>
            {hovered && (
              <motion.span
                key="label"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute right-full mr-2 hidden sm:block bg-blue-500 text-white px-3 py-1 rounded-md shadow-lg whitespace-nowrap text-xs"
              >
                Comunícate con nostros por nuestro chat
              </motion.span>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 6 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(!open)}
            className="relative bg-blue-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center group-hover:animate-bounce"
          >
            <MessageSquare className="w-6 h-6" />
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center border-2 border-white">
                {unread}
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-white">
                <Image
                  src="/ti_logo_final_blanco.png"
                  alt="Logo"
                  width={24}
                  height={24}
                  className="object-cover"
                />
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}