"use client";

import { memo, useMemo, Dispatch, SetStateAction } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Filter, ArrowUpDown, Search, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/chat-utils';

interface ChatClient {
  userId: number;
  name?: string | null;
  image?: string | null;
}

interface ChatPreviewMessage {
  text?: string | null;
  file?: string | null;
  createdAt?: string | null;
}

interface Props {
  clients: ChatClient[];
  selected: number | null;
  setSelected: (id: number) => void;
  displayName: (c: ChatClient) => string;
  lastMessages: Record<number, ChatPreviewMessage | null>;
  pendingCounts: Record<number, number>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  showPendingOnly: boolean;
  setShowPendingOnly: Dispatch<SetStateAction<boolean>>;
  sortByName: boolean;
  setSortByName: Dispatch<SetStateAction<boolean>>;
}

function ClientListComponent({
  clients,
  selected,
  setSelected,
  displayName,
  lastMessages,
  pendingCounts,
  search,
  setSearch,
  showPendingOnly,
  setShowPendingOnly,
  sortByName,
  setSortByName,
}: Props) {
  const filteredClients = useMemo(
    () =>
      clients
        .filter((c) =>
          displayName(c).toLowerCase().includes(search.toLowerCase()),
        )
        .filter((c) => !showPendingOnly || (pendingCounts[c.userId] ?? 0) > 0)
        .sort((a, b) =>
          sortByName
            ? displayName(a).localeCompare(displayName(b))
            : new Date(lastMessages[b.userId]?.createdAt ?? 0).getTime() -
              new Date(lastMessages[a.userId]?.createdAt ?? 0).getTime(),
        ),
    [
      clients,
      displayName,
      search,
      showPendingOnly,
      sortByName,
      lastMessages,
      pendingCounts,
    ],
  );

  return (
    <Card className="w-full md:w-80 flex flex-col overflow-hidden max-h-[70vh] md:max-h-none md:h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold">Conversaciones</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Solo pendientes"
            onClick={() => setShowPendingOnly((p) => !p)}
            className={cn(
              'h-7 w-7 cursor-pointer',
              showPendingOnly && 'bg-primary/10 text-primary',
            )}
          >
            <Filter className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ordenar por nombre"
            onClick={() => setSortByName((p) => !p)}
            className={cn(
              'h-7 w-7 cursor-pointer',
              sortByName && 'bg-primary/10 text-primary',
            )}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Client list */}
      <ul className="flex-1 overflow-y-auto">
        {filteredClients.length === 0 && (
          <li className="px-4 py-8 text-center text-xs text-muted-foreground">
            No hay conversaciones
          </li>
        )}
        {filteredClients.map((c) => {
          const pending = pendingCounts[c.userId] ?? 0;
          const lastMsg = lastMessages[c.userId];
          const previewText = lastMsg?.text
            ? lastMsg.text
            : lastMsg?.file
              ? 'Archivo adjunto'
              : 'Sin mensajes';

          return (
            <li key={c.userId}>
              <button
                onClick={() => setSelected(c.userId)}
                className={cn(
                  'w-full px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer',
                  'hover:bg-accent/50',
                  selected === c.userId &&
                    'bg-accent border-l-2 border-l-primary',
                )}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  {c.image ? (
                    <AvatarImage src={c.image} alt={displayName(c)} />
                  ) : null}
                  <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    {displayName(c)[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-sm truncate',
                        pending > 0 ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {displayName(c)}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatRelativeTime(lastMsg?.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span
                      className={cn(
                        'text-xs truncate max-w-[160px]',
                        pending > 0
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground',
                      )}
                    >
                      {lastMsg?.file && !lastMsg?.text && (
                        <Paperclip className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                      )}
                      {previewText}
                    </span>
                    {pending > 0 && (
                      <span className="shrink-0 flex items-center justify-center h-[18px] min-w-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                        {pending}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default memo(ClientListComponent);
