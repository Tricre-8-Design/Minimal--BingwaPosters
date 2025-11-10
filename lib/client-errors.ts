import { showToast } from "@/lib/supabase"

// Client-side error helpers to present pleasant messages and avoid leaking internals.
// - friendlyToastError: show a short, non-technical message
// - fetchJsonFriendly: wrapper around fetch with friendly errors and optional retry

export function friendlyToastError(message?: string, fallback?: string) {
  const text = message?.trim() || fallback || "We hit a snag. Please try again."
  showToast(text, "error")
}

export async function fetchJsonFriendly<T = any>(
  url: string,
  init: RequestInit,
  options?: {
    retryCount?: number
    retryDelayMs?: number
    userMessage?: string
    suppressToast?: boolean
  },
): Promise<{ ok: boolean; data?: T; message?: string; status?: number }> {
  const retryCount = options?.retryCount ?? 1
  const retryDelayMs = options?.retryDelayMs ?? 600
  const userMessage = options?.userMessage ?? "Couldn’t complete your request — please try again."

  let attempt = 0
  let lastError: any = null

  while (attempt <= retryCount) {
    try {
      const res = await fetch(url, init)
      const status = res.status
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg: string = String(json?.message || json?.error || userMessage)
        lastError = new Error(msg)
        throw lastError
      }
      return { ok: true, data: json as T, status }
    } catch (err: any) {
      lastError = err
      if (attempt < retryCount) {
        await new Promise((r) => setTimeout(r, retryDelayMs))
        attempt++
        continue
      }
      // Final failure: show friendly toast unless suppressed
      if (!options?.suppressToast) friendlyToastError(undefined, userMessage)
      return { ok: false, message: userMessage }
    }
  }

  // Should not reach here; return friendly failure
  if (!options?.suppressToast) friendlyToastError(undefined, userMessage)
  return { ok: false, message: userMessage }
}