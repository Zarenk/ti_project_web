'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical, Check, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, default as socket } from '@/lib/utils';

const LIMIT_MS = 5 * 60 * 1000;

interface Message {
  id: number;
  clientId: number;
  senderId: number;
  text: string;
  createdAt: string;
  seenAt?: string | null;
  file?: string;
}

interface EditableMessageProps {
  message: Message;
  isSender: boolean;
  userId: number;
  displayName?: string;
  avatarUrl?: string;
  onEdit?: (id: number, text: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function EditableMessage({
  message,
  isSender,
  userId,
  displayName = '',
  avatarUrl,
  onEdit,
  isFirst = true,
  isLast = true,
}: EditableMessageProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(message.text);

  useEffect(() => {
    if (!editing) setValue(message.text);
  }, [editing, message.text]);

  const canEdit =
    isSender && Date.now() - new Date(message.createdAt).getTime() < LIMIT_MS;

  const handleSave = () => {
    setEditing(false);
    if (value !== message.text) {
      onEdit?.(message.id, value);
      socket.emit('chat:edit', {
        id: message.id,
        senderId: userId,
        text: value,
      });
    }
  };

  const handleDelete = () => {
    socket.emit('chat:delete', { id: message.id, senderId: userId });
  };

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'flex items-end gap-2',
        isSender ? 'justify-end' : 'justify-start',
        isFirst ? 'mt-4' : 'mt-0.5',
      )}
    >
      {/* Avatar — receiver side, first in group only */}
      {!isSender &&
        (isFirst ? (
          <Avatar className="h-7 w-7 shrink-0 mb-0.5">
            {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
            <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              {displayName[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 shrink-0" />
        ))}

      {/* Bubble + edit actions */}
      <div
        className={cn(
          'group flex items-end gap-1 max-w-[80%] md:max-w-[65%]',
          isSender ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        <div
          className={cn(
            'relative px-3 py-1.5 text-sm shadow-sm',
            isSender
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted dark:bg-slate-800',
            // Base shape
            'rounded-2xl',
            // Grouped corner adjustments — sender (right side)
            isSender && !isLast && 'rounded-br-md',
            isSender && !isFirst && 'rounded-tr-md',
            // Grouped corner adjustments — receiver (left side)
            !isSender && !isLast && 'rounded-bl-md',
            !isSender && !isFirst && 'rounded-tl-md',
          )}
        >
          {/* Sender name — receiver side, first in group */}
          {isFirst && !isSender && displayName && (
            <p className="text-[11px] font-semibold text-primary/80 dark:text-primary/70 mb-0.5">
              {displayName}
            </p>
          )}

          {editing ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setEditing(false);
                  setValue(message.text);
                }
              }}
              rows={1}
              className="text-sm min-w-[180px]"
              autoFocus
            />
          ) : (
            <>
              {message.text && (
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.text}
                </p>
              )}
              {message.file && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.file}
                  alt="Archivo adjunto"
                  className="mt-1.5 max-h-60 rounded-lg"
                />
              )}
              {/* Timestamp + seen indicator */}
              <div
                className={cn(
                  'flex items-center gap-1 mt-0.5 select-none',
                  isSender ? 'justify-end' : 'justify-start',
                )}
              >
                <span
                  className={cn(
                    'text-[10px] leading-none',
                    isSender
                      ? 'text-primary-foreground/50'
                      : 'text-muted-foreground/70',
                  )}
                >
                  {time}
                </span>
                {isSender &&
                  (message.seenAt ? (
                    <CheckCheck className="h-3 w-3 text-sky-300" />
                  ) : (
                    <Check className="h-3 w-3 text-primary-foreground/40" />
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Edit/delete dropdown */}
        {canEdit && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Opciones del mensaje"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isSender ? 'start' : 'end'}>
              <DropdownMenuItem
                onClick={() => setEditing(true)}
                className="cursor-pointer"
              >
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={handleDelete}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}
