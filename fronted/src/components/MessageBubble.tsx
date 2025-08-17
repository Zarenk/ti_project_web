import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn, default as socket } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LIMIT_MS = 5 * 60 * 1000;

interface MessageBubbleProps {
  id: number;
  text: string;
  file?: string;
  isSender: boolean;
  createdAt: string;
  userId: number;
  onEdit?: (id: number, text: string) => void;
}

export function MessageBubble({
  id,
  text,
  file,
  isSender,
  createdAt,
  userId,
  onEdit,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);

  useEffect(() => {
    if (!editing) {
      setValue(text);
    }
  }, [text, editing]);

  const canEdit =
    isSender && Date.now() - new Date(createdAt).getTime() < LIMIT_MS;

  const handleSave = () => {
    setEditing(false);
    if (value !== text) {
      onEdit?.(id, value);
      socket.emit("chat:edit", { id, senderId: userId, text: value });
    }
  };

  const handleDelete = () => {
    socket.emit("chat:delete", { id, senderId: userId });
  };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
      className={cn("flex", isSender ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "group flex items-start gap-1",
          isSender ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "p-3 rounded-2xl max-w-[80%] border shadow",
            isSender
              ? "bg-gradient-to-r from-blue-200 to-blue-300 text-blue-900"
              : "bg-gradient-to-r from-pink-200 to-purple-200 text-purple-900"
          )}
        >
          {editing ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                  setValue(text);
                }
              }}
              rows={1}
              className="text-sm"
              autoFocus
            />
          ) : (
            <>
              {text && <p className="text-sm">{text}</p>}
              {file && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file}
                  alt="Archivo adjunto"
                  className="mt-2 max-h-60 rounded-md"
                />
              )}
              <div className="mt-2 flex items-center gap-2 text-[10px] opacity-70">
                <Avatar className="h-4 w-4">
                  <AvatarFallback>{isSender ? "T" : "A"}</AvatarFallback>
                </Avatar>
                <span>{new Date(createdAt).toLocaleTimeString()}</span>
              </div>
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
    </motion.div>
  );
}

export default MessageBubble;