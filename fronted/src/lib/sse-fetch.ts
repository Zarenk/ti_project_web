/**
 * SSE fetch utility — consumes Server-Sent Events from a POST endpoint.
 * We can't use native EventSource because it only supports GET.
 */

import { getAuthHeaders } from "@/utils/auth-token"

export interface SseCallbacks {
  onChunk: (text: string) => void
  onDone: (data: { messageId: number; source: string; fullText: string }) => void
  onMessage: (data: { messageId: number; answer: string; source: string }) => void
  onError: (error: string) => void
}

function resolveUrl(path: string): string {
  const rawBase =
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:4000"
  const base = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase
  const normalizedBase = /\/api$/i.test(base) ? base : `${base}/api`
  const slash = path.startsWith("/") ? "" : "/"
  return normalizedBase + slash + path
}

/**
 * Opens a POST fetch to `path` (relative to backend), reads the SSE stream,
 * and dispatches callbacks for each event type: chunk, done, message, error.
 * Returns an AbortController so the caller can cancel.
 */
export function fetchSSE(
  path: string,
  body: Record<string, unknown>,
  callbacks: SseCallbacks,
): AbortController {
  const controller = new AbortController()

  ;(async () => {
    try {
      const url = resolveUrl(path)
      const authHeaders = await getAuthHeaders()

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        callbacks.onError(`HTTP ${response.status}`)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE blocks are separated by double newline
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""

        for (const block of blocks) {
          if (!block.trim()) continue

          let eventName = "message"
          let eventData = ""

          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) {
              eventName = line.slice(7).trim()
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6)
            }
          }

          if (!eventData) continue

          try {
            const parsed = JSON.parse(eventData)

            switch (eventName) {
              case "chunk":
                callbacks.onChunk(parsed.text ?? "")
                break
              case "done":
                callbacks.onDone(parsed)
                break
              case "message":
                callbacks.onMessage(parsed)
                break
              case "error":
                callbacks.onError(parsed.error ?? "Unknown error")
                break
            }
          } catch {
            // Malformed JSON — skip
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        callbacks.onError(err?.message ?? "Stream connection failed")
      }
    }
  })()

  return controller
}
