// utils/json-safe.ts
import { Prisma } from '@prisma/client';

export function toJsonSafe<T = unknown>(value: T): Prisma.JsonValue {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'bigint') return v.toString();
      return v;
    }),
  );
}