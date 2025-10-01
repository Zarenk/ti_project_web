"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/context/site-settings-context";

export function ThemeModeSync() {
  const { settings } = useSiteSettings();
  const { setTheme } = useTheme();
  const mode = settings.theme.mode;

  useEffect(() => {
    if (!mode) {
      return;
    }

    setTheme(mode);
  }, [mode, setTheme]);

  return null;
}