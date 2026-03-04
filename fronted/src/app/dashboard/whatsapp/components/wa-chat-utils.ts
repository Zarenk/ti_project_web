/**
 * WhatsApp Chat Utilities — phone formatting, message grouping, and display helpers.
 */

/** Extract clean phone number from a WhatsApp JID */
export function formatPhoneNumber(jid: string): string {
  return jid.split('@')[0];
}

/** Get initial letter for avatar from name or phone */
export function getContactInitial(name?: string | null, phone?: string): string {
  if (name) return name.charAt(0).toUpperCase();
  if (phone) return phone.charAt(0);
  return '?';
}

/** Truncated preview of the last message for the conversation list */
export function getMessagePreview(content: string, type: string): string {
  if (type === 'IMAGE') return '📷 Imagen';
  if (type === 'VIDEO') return '🎥 Video';
  if (type === 'AUDIO') return '🎵 Audio';
  if (type === 'DOCUMENT') return '📄 Documento';
  // Truncate long text
  return content.length > 50 ? content.slice(0, 50) + '…' : content;
}

// Protocol/internal messages that should never be shown
const HIDDEN_CONTENT_PREFIXES = [
  '[protocolMessage]',
  '[senderKeyDistributionMessage]',
  '[messageContextInfo]',
  '[reactionMessage]',
  '[ephemeralMessage]',
  '[keepInChatMessage]',
  '[peerDataOperationRequestResponseMessage]',
];

/** Check if message is a protocol/internal message that should be hidden */
export function isHiddenMessage(content: string): boolean {
  return HIDDEN_CONTENT_PREFIXES.includes(content);
}

export interface WAMessage {
  id: number;
  remoteJid: string;
  content: string;
  messageType: string;
  isFromMe: boolean;
  status: string;
  createdAt: string;
  sentAt?: string | null;
  clientId?: number | null;
  client?: { id: number; name: string } | null;
}

export interface GroupedWAMessage extends WAMessage {
  isFirst: boolean;
  isLast: boolean;
  showDateSeparator: string | null;
}

const GROUP_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

/** Group WhatsApp messages by date and consecutive sender */
export function groupWhatsAppMessages(messages: WAMessage[]): GroupedWAMessage[] {
  if (messages.length === 0) return [];

  const result: GroupedWAMessage[] = [];
  let lastDateStr = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    const msgDate = new Date(msg.createdAt);
    const msgDateStr = msgDate.toDateString();

    let dateSeparator: string | null = null;
    if (msgDateStr !== lastDateStr) {
      dateSeparator = formatDateLabel(msgDate);
      lastDateStr = msgDateStr;
    }

    const sameAsPrev =
      prev !== null &&
      prev.isFromMe === msg.isFromMe &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_THRESHOLD_MS &&
      msgDateStr === new Date(prev.createdAt).toDateString();

    const sameAsNext =
      next !== null &&
      next.isFromMe === msg.isFromMe &&
      new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() < GROUP_THRESHOLD_MS &&
      msgDateStr === new Date(next.createdAt).toDateString();

    result.push({
      ...msg,
      isFirst: !sameAsPrev || dateSeparator !== null,
      isLast: !sameAsNext,
      showDateSeparator: dateSeparator,
    });
  }

  return result;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
