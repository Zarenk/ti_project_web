'use client'

import { memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';

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

interface MessagesListProps {
  messages: Message[];
  userId?: number;
  onEdit?: (id: number, text: string) => void;
}

function MessagesListComponent({
  messages,
  userId,
  onEdit,
}: MessagesListProps) {
  return (
    <AnimatePresence initial={false}>
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          id={m.id}
          text={m.text}
          file={m.file}
          createdAt={m.createdAt}
          isSender={m.senderId === userId}
          onEdit={onEdit}
        />
      ))}
    </AnimatePresence>
  );
}

export default memo(
  MessagesListComponent,
  (prev, next) => prev.messages === next.messages,
);