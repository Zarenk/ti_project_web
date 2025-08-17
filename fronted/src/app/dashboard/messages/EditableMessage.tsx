'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
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
  displayName: string;
  onEdit: (id: number, text: string) => void;
}

export default function EditableMessage({
  message,
  isSender,
  userId,
  displayName,
  onEdit,
}: EditableMessageProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(message.text);

  useEffect(() => {
    if (!editing) {
      setValue(message.text);
    }
  }, [editing, message.text]);

  const canEdit =
    isSender && Date.now() - new Date(message.createdAt).getTime() < LIMIT_MS;

  const handleSave = () => {
    setEditing(false);
    if (value !== message.text) {
      onEdit(message.id, value);
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

  return (
    <div className={cn('max-w-[80%]', isSender ? 'ml-auto text-right' : 'mr-auto')}>
      <div
        className={cn(
          'group flex items-start gap-1',
          isSender ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        <div
          className={cn(
            'rounded-lg p-2',
            isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
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
              className="text-sm"
              autoFocus
            />
          ) : (
            <>
              <p className="text-xs mb-1">
                <span className="font-medium">{displayName}</span>{' '}
                <span className="text-muted-foreground">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </span>
              </p>
            <p>{message.text}</p>
              {message.file && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.file}
                  alt="Archivo adjunto"
                  className="mt-2 max-h-60 rounded-md"
                />
              )}
              {isSender && message.seenAt && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Visto {new Date(message.seenAt).toLocaleTimeString()}
                </p>
              )}
            </>
          )}
        </div>
        {canEdit && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 mt-1"
                aria-label="Opciones del mensaje"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
