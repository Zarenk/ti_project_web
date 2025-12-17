const STORAGE_KEY = "app_user_context_preferences"

export type ContextPreferences = {
  rememberLastContext: boolean
}

const DEFAULT_PREFERENCES: ContextPreferences = {
  rememberLastContext: true,
}

export function getContextPreferences(): ContextPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_PREFERENCES
    }
    const parsed = JSON.parse(raw) as Partial<ContextPreferences>
    return {
      rememberLastContext:
        typeof parsed.rememberLastContext === "boolean"
          ? parsed.rememberLastContext
          : DEFAULT_PREFERENCES.rememberLastContext,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function updateContextPreferences(
  partial: Partial<ContextPreferences>,
): ContextPreferences {
  const next = {
    ...getContextPreferences(),
    ...partial,
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(
        new CustomEvent<ContextPreferences>("context-preferences-change", {
          detail: next,
        }),
      )
    } catch {
      /* ignore */
    }
  }

  return next
}

export function shouldRememberContext(): boolean {
  return getContextPreferences().rememberLastContext
}

export function clearContextPreferences(): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }

  try {
    window.dispatchEvent(
      new CustomEvent<ContextPreferences>("context-preferences-change", {
        detail: DEFAULT_PREFERENCES,
      }),
    )
  } catch {
    /* ignore */
  }
}
