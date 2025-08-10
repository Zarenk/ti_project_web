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
}

function MessagesListComponent({ messages, userId }: MessagesListProps) {
  return (
    <AnimatePresence initial={false}>
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          text={m.text}
          file={m.file}
          time={m.createdAt}
          isSender={m.senderId === userId}
        />
      ))}
    </AnimatePresence>
  );
}

export default memo(
  MessagesListComponent,
  (prev, next) => prev.messages === next.messages,
);