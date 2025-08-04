"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  getMessages,
  getUnansweredMessages,
  sendMessage,
} from './messages.api';

export default function Page() {
  const { userId } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    getUnansweredMessages()
      .then(setPending)
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selected !== null) {
      getMessages(selected)
        .then(setHistory)
        .catch((err) => console.error(err));
    }
  }, [selected]);

  const handleSend = async () => {
    if (!userId || selected === null || !text.trim()) return;
    try {
      const msg = await sendMessage({
        clientId: selected,
        senderId: userId,
        text,
      });
      setHistory((prev) => [...prev, msg]);
      setText('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold mb-4">Mensajes</h1>
      <div className="flex gap-4">
        <div className="w-1/3">
          <h2 className="font-semibold mb-2">Pendientes</h2>
          <ul className="border rounded p-2 h-64 overflow-y-auto">
            {pending.map((m) => (
              <li
                key={m.id}
                onClick={() => setSelected(m.clientId)}
                className={`p-2 cursor-pointer border-b last:border-b-0 ${
                  selected === m.clientId ? 'bg-gray-200' : ''
                }`}
              >
                {m.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1">
          {selected === null ? (
            <p>Selecciona un mensaje para ver la conversación.</p>
          ) : (
            <>
              <ul className="border rounded p-2 h-64 overflow-y-auto mb-2">
                {history.map((m) => (
                  <li key={m.id} className="mb-1">
                    <span
                      className={
                        m.senderId === m.clientId
                          ? 'text-blue-600'
                          : 'text-green-600'
                      }
                    >
                      {m.text}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  className="border flex-1 p-2"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button
                  onClick={handleSend}
                  className="bg-blue-500 text-white px-4 py-2"
                >
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
