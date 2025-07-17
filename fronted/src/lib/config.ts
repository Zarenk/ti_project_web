// Centralized application configuration

// DEFAULT_STORE_ID is loaded from the environment variable `NEXT_PUBLIC_STORE_ID`.
// Fallback to `1` if the variable is not provided.
export const DEFAULT_STORE_ID = process.env.NEXT_PUBLIC_STORE_ID
  ? Number(process.env.NEXT_PUBLIC_STORE_ID)
  : 1;
