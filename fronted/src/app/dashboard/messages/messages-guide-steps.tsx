import {
  MessageSquare,
  Users,
  Send,
  Paperclip,
  Eye,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const MESSAGES_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Sistema de mensajes",
    description:
      "Comunícate en tiempo real con los usuarios de tu organización. Los mensajes se envían instantáneamente y se sincronizan en todos los dispositivos.",
    tips: [
      "Los mensajes se actualizan en tiempo real via WebSocket.",
      "Las conversaciones se organizan por usuario/cliente.",
      "Los mensajes no leídos se indican con un contador.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Lista de conversaciones",
    description:
      "En el panel izquierdo verás todas tus conversaciones activas. Selecciona una para ver el historial de mensajes.",
    tips: [
      "Las conversaciones con mensajes no leídos aparecen primero.",
      "El nombre y avatar del usuario se muestran en cada conversación.",
      "En móvil, usa el botón 'Conversaciones' para volver a la lista.",
    ],
  },
  {
    icon: <Send className="h-5 w-5" />,
    title: "Enviar mensajes",
    description:
      "Escribe tu mensaje en el campo inferior y presiona Enter o el botón de enviar. El mensaje se entrega instantáneamente.",
    tips: [
      "Presiona Enter para enviar rápidamente.",
      "Los mensajes enviados aparecen a la derecha en azul.",
      "Los mensajes recibidos aparecen a la izquierda en gris.",
      "Puedes editar mensajes ya enviados haciendo clic sobre ellos.",
    ],
  },
  {
    icon: <Paperclip className="h-5 w-5" />,
    title: "Adjuntar archivos",
    description:
      "Envía archivos e imágenes junto con tus mensajes usando el botón de adjuntar.",
    tips: [
      "Usa el ícono de clip para seleccionar un archivo.",
      "Se soportan imágenes, documentos y otros archivos.",
      "Los archivos se suben automáticamente al enviar.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Estado de lectura",
    description:
      "El sistema muestra cuándo tus mensajes han sido vistos por el destinatario.",
    tips: [
      "El indicador de 'visto' aparece cuando el destinatario abre el mensaje.",
      "El indicador de escritura muestra cuando alguien está escribiendo.",
      "Los contadores de no leídos se actualizan en tiempo real.",
    ],
  },
]
