"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getUnansweredMessages } from "@/app/dashboard/messages/messages.api";
import { useAuth } from "./auth-context";
import { useOptionalTenantSelection } from "@/context/tenant-selection-context";
import socket from "@/lib/utils";

interface MessagesContextType {
  pendingCounts: Record<number, number>;
  setPendingCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  totalUnread: number;
  refreshCounts: () => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [pendingCounts, setPendingCounts] = useState<Record<number, number>>({});
  const { userId } = useAuth();
  const tenantSelection = useOptionalTenantSelection();
  const hasTenant = Boolean(
    tenantSelection?.selection.orgId || tenantSelection?.selection.companyId,
  );

  const loadCounts = useCallback(async () => {
    try {
      const pending = await getUnansweredMessages();
      const counts = Object.fromEntries(
        pending.map((m: { clientId: number; count: number }) => [m.clientId, m.count]),
      );
      setPendingCounts(counts);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (userId !== null && hasTenant) {
      loadCounts();
    }
  }, [userId, hasTenant, loadCounts]);

  // Real-time updates via socket
  useEffect(() => {
    if (userId === null) return;

    const receiveHandler = (msg: { clientId: number; senderId: number }) => {
      // Only count messages FROM the client (not from agents)
      if (msg.senderId === msg.clientId) {
        setPendingCounts((prev) => ({
          ...prev,
          [msg.clientId]: (prev[msg.clientId] ?? 0) + 1,
        }));
      }
    };

    const seenHandler = ({ clientId, viewerId }: { clientId: number; viewerId: number }) => {
      // Agent viewed client's messages → clear that client's pending count
      if (viewerId !== clientId) {
        setPendingCounts((prev) => {
          if (!prev[clientId]) return prev;
          const next = { ...prev };
          delete next[clientId];
          return next;
        });
      }
    };

    socket.on('chat:receive', receiveHandler);
    socket.on('chat:seen', seenHandler);

    return () => {
      socket.off('chat:receive', receiveHandler);
      socket.off('chat:seen', seenHandler);
    };
  }, [userId]);

  const totalUnread = Object.values(pendingCounts).reduce(
    (acc, count) => acc + count,
    0,
  );

  return (
    <MessagesContext.Provider value={{ pendingCounts, setPendingCounts, totalUnread, refreshCounts: loadCounts }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
}
