export type AnalyticsEvent = {
  name: string
  payload?: Record<string, unknown>
  timestamp: number
}

const eventBuffer: AnalyticsEvent[] = []
const MAX_EVENTS = 50
const listeners = new Set<(event: AnalyticsEvent) => void>()

const ANALYTICS_ENDPOINT =
  process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim() || null
const DEV_DEDUP_WINDOW_MS = 1500
const devRecentEvents = new Map<string, number>()

function buildDedupeKey(name: string, data?: Record<string, unknown>) {
  if (!data) return name
  const relevant = ["source", "orgId", "companyId", "reason", "variant"]
    .filter((key) => key in data)
    .map((key) => `${key}:${String(data[key])}`)
    .join("|")
  return relevant ? `${name}|${relevant}` : name
}

export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    const key = buildDedupeKey(name, data)
    const last = devRecentEvents.get(key)
    const now = Date.now()
    if (last && now - last < DEV_DEDUP_WINDOW_MS) {
      return
    }
    devRecentEvents.set(key, now)
  }
  const event: AnalyticsEvent = {
    name,
    payload: data ?? {},
    timestamp: Date.now(),
  }

  addToBuffer(event)
  notifyListeners(event)
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", name, data ?? {})
  }
  if (ANALYTICS_ENDPOINT) {
    void sendToAnalyticsEndpoint(event)
  }
}

function addToBuffer(event: AnalyticsEvent) {
  eventBuffer.push(event)
  if (eventBuffer.length > MAX_EVENTS) {
    eventBuffer.shift()
  }
}

function notifyListeners(event: AnalyticsEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (error) {
      console.warn("[analytics] listener error", error)
    }
  }
}

async function sendToAnalyticsEndpoint(event: AnalyticsEvent) {
  try {
    await fetch(ANALYTICS_ENDPOINT!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] failed to send event", error)
    }
  }
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  return [...eventBuffer]
}

export function subscribeToAnalytics(
  listener: (event: AnalyticsEvent) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
