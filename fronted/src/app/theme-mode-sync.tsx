"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/context/site-settings-context";

export function ThemeModeSync() {
  const { settings } = useSiteSettings();
  const { setTheme } = useTheme();
  const mode = settings.theme.mode;
  const lastSyncedModeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mode) {
      return;
    }

    if (lastSyncedModeRef.current === mode) {
      return;
    }

    lastSyncedModeRef.current = mode;

    if (typeof window !== "undefined") {
      const storedTheme = window.localStorage.getItem("theme");

      if (storedTheme && storedTheme !== mode && storedTheme !== "system") {
        return;
      }
    }

    setTheme(mode);
  }, [mode, setTheme]);

  return null;
}