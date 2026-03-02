interface Message {
  id: number;
  clientId: number;
  senderId: number;
  text: string;
  createdAt: string;
  seenAt?: string | null;
  file?: string;
  tempId?: number;
}

const GROUP_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export interface GroupedMessage extends Message {
  isFirst: boolean;
  isLast: boolean;
  showDateSeparator: string | null;
}

/**
 * Groups consecutive messages from the same sender within 3 minutes.
 * Adds date separator labels between different days.
 */
export function groupMessages(messages: Message[]): GroupedMessage[] {
  if (messages.length === 0) return [];

  const result: GroupedMessage[] = [];
  let lastDateStr = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    const msgDateStr = new Date(msg.createdAt).toDateString();
    let dateSeparator: string | null = null;
    if (msgDateStr !== lastDateStr) {
      dateSeparator = formatDateLabel(msg.createdAt);
      lastDateStr = msgDateStr;
    }

    const sameAsPrev =
      prev !== null &&
      prev.senderId === msg.senderId &&
      new Date(msg.createdAt).getTime() -
        new Date(prev.createdAt).getTime() <
        GROUP_THRESHOLD_MS &&
      msgDateStr === new Date(prev.createdAt).toDateString();

    const sameAsNext =
      next !== null &&
      next.senderId === msg.senderId &&
      new Date(next.createdAt).getTime() -
        new Date(msg.createdAt).getTime() <
        GROUP_THRESHOLD_MS &&
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

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
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

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (
    date.toDateString() ===
    new Date(now.getTime() - 86400000).toDateString()
  ) {
    return 'ayer';
  }

  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  });
}
