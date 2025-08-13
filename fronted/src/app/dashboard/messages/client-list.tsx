"use client";

import { memo, useMemo, Dispatch, SetStateAction } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Filter, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  clients: any[];
  selected: number | null;
  setSelected: (id: number) => void;
  displayName: (c: any) => string;
  lastMessages: Record<number, any>;
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
        .filter((c: any) =>
          displayName(c).toLowerCase().includes(search.toLowerCase()),
        )
        .filter(
          (c: any) => !showPendingOnly || (pendingCounts[c.userId] ?? 0) > 0,
        )
        .sort((a: any, b: any) =>
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
    <Card className="w-full md:w-1/3 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-0 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversaciones</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Filtrar"
            onClick={() => setShowPendingOnly((p) => !p)}
            className="hover:bg-blue-100 hover:text-blue-600 h-8 w-8"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ordenar"
            onClick={() => setSortByName((p) => !p)}
            className="hover:bg-blue-100 hover:text-blue-600 h-8 w-8"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="border-b px-4 py-1 flex items-center">
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ul className="flex-1 overflow-y-auto divide-y">
        {filteredClients.map((c: any) => (
          <li key={c.userId}>
            <button
              onClick={() => setSelected(c.userId)}
              className={cn(
                'w-full px-4 py-3 text-left transition-transform bg-gradient-to-r from-background to-muted hover:shadow-md hover:scale-105',
                selected === c.userId && 'from-primary/10 to-primary/5',
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={c.image || '/placeholder.svg'}
                    alt={displayName(c)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{displayName(c)}</span>
                    <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                      {lastMessages[c.userId]?.text ||
                        (lastMessages[c.userId]?.file
                          ? 'Archivo adjunto'
                          : 'Sin mensajes')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {lastMessages[c.userId]?.createdAt
                      ? new Date(
                          lastMessages[c.userId]!.createdAt,
                        ).toLocaleTimeString()
                      : ''}
                  </span>
                  {pendingCounts[c.userId] > 0 && (
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {pendingCounts[c.userId]}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default memo(ClientListComponent);