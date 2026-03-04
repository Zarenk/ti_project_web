'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { type WASocketMessage } from '@/hooks/use-whatsapp-socket';
import ConversationList from './conversation-list';
import ChatView from './chat-view';

interface MessagesHistoryPanelProps {
  isConnected: boolean;
}

export default function MessagesHistoryPanel({ isConnected }: MessagesHistoryPanelProps) {
  const [selectedJid, setSelectedJid] = useState<string | null>(null);

  // Handle socket messages — route to conversation list and chat view
  const handleIncomingMessage = useCallback((msg: WASocketMessage) => {
    // Update conversation list
    (window as any).__waConvList?.updateConversation(
      msg.remoteJid,
      msg.content,
      msg.messageType,
      msg.isFromMe
    );

    // Update chat view if it's the active conversation
    (window as any).__waChatView?.addIncomingMessage(msg);
  }, []);

  const handleSentMessage = useCallback((msg: WASocketMessage) => {
    (window as any).__waConvList?.updateConversation(
      msg.remoteJid,
      msg.content,
      msg.messageType,
      true
    );
    (window as any).__waChatView?.addIncomingMessage({ ...msg, isFromMe: true });
  }, []);

  // Register socket event handlers
  useEffect(() => {
    (window as any).__waMessageHandlers = {
      onMessage: handleIncomingMessage,
      onMessageSent: handleSentMessage,
    };
    return () => { delete (window as any).__waMessageHandlers; };
  }, [handleIncomingMessage, handleSentMessage]);

  const handleSelectConversation = (jid: string) => {
    setSelectedJid(jid);
  };

  const handleBack = () => {
    setSelectedJid(null);
  };

  return (
    <Card className="w-full min-w-0 overflow-hidden border shadow-sm">
      {/* Desktop: side-by-side | Mobile: show one at a time */}
      <div className="flex h-[500px] sm:h-[600px] lg:h-[650px] w-full min-w-0 overflow-hidden">
        {/* Conversation List — always visible on desktop, hidden on mobile when chat is open */}
        <div className={`${
          selectedJid ? 'hidden sm:flex' : 'flex'
        } flex-col w-full sm:w-72 lg:w-80 border-r flex-shrink-0 min-w-0 overflow-hidden`}>
          <ConversationList
            selectedJid={selectedJid}
            onSelect={handleSelectConversation}
          />
        </div>

        {/* Chat View — hidden on mobile when no conversation selected */}
        <div className={`${
          selectedJid ? 'flex' : 'hidden sm:flex'
        } flex-col flex-1 min-w-0 overflow-hidden`}>
          {selectedJid ? (
            <ChatView
              remoteJid={selectedJid}
              isConnected={isConnected}
              onBack={handleBack}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center px-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="h-8 w-8 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium">Selecciona una conversación</p>
                <p className="text-xs mt-1">Elige un contacto de la lista para ver los mensajes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
