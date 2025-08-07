import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  text: string;
  file?: string;
  isSender: boolean;
  time: string;
}

export function MessageBubble({ text, file, isSender, time }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex",
        isSender ? "justify-end" : "justify-start"
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
        {text && <p>{text}</p>}
        {file && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file} alt="Archivo adjunto" className="mt-2 max-h-60 rounded-md" />
        )}
        <div className="mt-2 flex items-center gap-2 text-[10px] opacity-70">
          <Avatar className="h-4 w-4">
            <AvatarFallback>{isSender ? "T" : "A"}</AvatarFallback>
          </Avatar>
          <span>{new Date(time).toLocaleTimeString()}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default MessageBubble;