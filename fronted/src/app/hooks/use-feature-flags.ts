"use client"

const defaultFlags: Record<string, boolean> = {
  ads: true,
}

const envFlags = (process.env.NEXT_PUBLIC_FEATURE_FLAGS || "")
  .split(",")
  .reduce<Record<string, boolean>>((acc, flag) => {
    const key = flag.trim()
    if (key) acc[key] = true
    return acc
  }, {})

const flags = { ...defaultFlags, ...envFlags }

export function useFeatureFlag(flag: string) {
  return !!flags[flag]
}