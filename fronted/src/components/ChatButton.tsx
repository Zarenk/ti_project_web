"use client"

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import ChatPanel from "./ChatPanel";

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatPanel onClose={() => setOpen(false)} />}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-22 right-6 z-60"
      >
        <button
          onClick={() => setOpen(!open)}
          className="bg-blue-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </motion.div>
    </>
  );
}