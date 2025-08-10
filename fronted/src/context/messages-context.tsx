"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getUnansweredMessages } from "@/app/dashboard/messages/messages.api";
import { isTokenValid } from "@/lib/auth";

interface MessagesContextType {
  pendingCounts: Record<number, number>;
  setPendingCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  totalUnread: number;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [pendingCounts, setPendingCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const pending = await getUnansweredMessages();
        const counts = Object.fromEntries(
          pending.map((m: { clientId: number; count: number }) => [m.clientId, m.count]),
        );
        setPendingCounts(counts);
      } catch (err) {
        console.error(err);
      }
    };
    isTokenValid().then((valid) => {
      if (valid) {
        load();
      }
    });
    
  }, []);

  const totalUnread = Object.values(pendingCounts).reduce(
    (acc, count) => acc + count,
    0,
  );

  return (
    <MessagesContext.Provider value={{ pendingCounts, setPendingCounts, totalUnread }}>
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