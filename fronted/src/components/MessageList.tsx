'use client'

import { Fragment, memo, useMemo } from 'react';
import EditableMessage from '@/app/dashboard/messages/EditableMessage';
import { groupMessages } from '@/lib/chat-utils';

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
  userId: number;
  onEdit?: (id: number, text: string) => void;
}

function MessagesListComponent({
  messages,
  userId,
  onEdit,
}: MessagesListProps) {
  const grouped = useMemo(() => groupMessages(messages), [messages]);

  return (
    <>
      {grouped.map((m) => (
        <Fragment key={m.tempId ?? m.id}>
          {m.showDateSeparator && (
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-medium bg-background px-2 py-0.5 rounded-full shadow-sm border">
                {m.showDateSeparator}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <EditableMessage
            message={m}
            isSender={m.senderId === userId}
            userId={userId}
            onEdit={onEdit}
            isFirst={m.isFirst}
            isLast={m.isLast}
          />
        </Fragment>
      ))}
    </>
  );
}

export default memo(
  MessagesListComponent,
  (prev, next) => prev.messages === next.messages,
);
