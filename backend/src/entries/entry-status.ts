export const EntryStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  CANCELED: 'CANCELED',
} as const;

export type EntryStatus = (typeof EntryStatus)[keyof typeof EntryStatus];
