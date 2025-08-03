"use client"

import { useState } from "react";
import Image from "next/image";
import { MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatPanel from "./ChatPanel";

export default function ChatButton() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

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
          className="relative block"
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
          <button
            onClick={() => setOpen(!open)}
            className="relative bg-blue-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-white">
              <Image src="/ti_logo_final_blanco.png" alt="Logo" width={24} height={24} className="object-cover" />
            </span>
          </button>
        </div>
      </motion.div>
    </>
  );
}