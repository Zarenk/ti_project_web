"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

const DEFAULT_MESSAGE = "¿Necesitas ayuda? Escríbenos por WhatsApp";

export function FloatingWhatsAppButton() {
  const [mostrarTooltip, setMostrarTooltip] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "51900000000";
  const enlaceWhatsApp = `https://wa.me/${number}`;

  return (
    <>
      <style>{`
        @keyframes pulso-luminoso {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7),
                        0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0),
                        0 0 0 20px rgba(34, 197, 94, 0);
          }
        }

        @keyframes brillo-suave {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 8px rgba(34, 197, 94, 0.4));
          }
          50% {
            filter: brightness(1.1) drop-shadow(0 0 16px rgba(34, 197, 94, 0.6));
          }
        }

        .boton-whatsapp-flotante {
          animation: pulso-luminoso 2s infinite;
        }

        .boton-whatsapp-flotante:hover {
          animation: brillo-suave 1.5s infinite;
        }

        .tooltip-whatsapp {
          animation: fadeInTooltip 0.3s ease-in-out;
        }

        @keyframes fadeInTooltip {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .boton-whatsapp-variant {
          background: linear-gradient(135deg, #25d366 0%, #20ba5a 100%);
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.25);
        }

        .dark .boton-whatsapp-variant {
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.3);
        }
      `}</style>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {mostrarTooltip && (
          <div className="tooltip-whatsapp relative bg-slate-900 text-white text-sm px-4 py-2 rounded-full whitespace-nowrap shadow-lg">
            <span className="font-medium">{DEFAULT_MESSAGE}</span>
            <div className="absolute bottom-0 right-6 translate-y-full">
              <div className="border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        )}

        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={DEFAULT_MESSAGE}
          title={DEFAULT_MESSAGE}
          onMouseEnter={() => setMostrarTooltip(true)}
          onMouseLeave={() => setMostrarTooltip(false)}
          className="boton-whatsapp-flotante boton-whatsapp-variant group relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
        >
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          <MessageCircle
            className="relative w-6 h-6 text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-125"
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <div className="absolute inset-0 rounded-full border-2 border-green-300 opacity-0 group-hover:opacity-40 transition-opacity duration-300 animate-pulse" />
        </a>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 px-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">En línea ahora</span>
        </div>
      </div>
    </>
  );
}
