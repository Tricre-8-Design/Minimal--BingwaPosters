// Lightweight console logger with timestamp and safe redaction
// Provides: logInfo, logStep, logError, safeRedact
// - Works in both server (Node/Edge) and client (browser)
// - Redacts sensitive keys recursively (token, secret, password, key, passkey, authorization, cookie)

type AnyRecord = Record<string, any>

const SENSITIVE_KEYS = /^(token|secret|password|passkey|key|authorization|cookie)$/i

function nowIso(): string {
  try {
    return new Date().toISOString()
  } catch {
    return String(Date.now())
  }
}

export function safeRedact<T = any>(input: T, depth = 0): T {
  // Avoid deep recursion
  if (depth > 6) return input
  if (input === null || input === undefined) return input
  if (typeof input !== "object") return input

  if (Array.isArray(input)) {
    return input.map((v) => safeRedact(v, depth + 1)) as any
  }

  const out: AnyRecord = {}
  for (const [k, v] of Object.entries(input as AnyRecord)) {
    if (SENSITIVE_KEYS.test(k)) {
      // Preserve type info (string/obj) but redact value
      out[k] = typeof v === "string" ? "<redacted>" : { redacted: true }
      continue
    }
    out[k] = safeRedact(v, depth + 1)
  }
  return out as T
}

function fmt(scope: string, message: string, meta?: AnyRecord): string {
  const ts = nowIso()
  let suffix = ""
  if (meta && Object.keys(meta).length > 0) {
    try {
      suffix = ` | meta=${JSON.stringify(safeRedact(meta))}`
    } catch {
      suffix = ""
    }
  }
  return `[${ts}] [${scope}] ${message}${suffix}`
}

export function logInfo(scope: string, message: string, meta?: AnyRecord): void {
  // Use console.log for info level
  try {
    console.log(fmt(scope, message, meta))
  } catch {}
}

export function logStep(scope: string, step: string, meta?: AnyRecord): void {
  // Uniform step marker to trace ordered execution
  logInfo(scope, `STEP: ${step}`, meta)
}

export function logError(scope: string, error: any, meta?: AnyRecord): void {
  try {
    const ts = nowIso()
    const name = error?.name
    const message = String(error?.message || error || "Unknown error")
    const stack = error?.stack
    const base = `[${ts}] [${scope}] ERROR: ${message}${name ? ` (${name})` : ""}`
    const suffix = meta && Object.keys(meta).length > 0 ? ` | meta=${JSON.stringify(safeRedact(meta))}` : ""
    if (stack) {
      console.error(`${base}${suffix}\nSTACK: ${stack}`)
    } else {
      console.error(`${base}${suffix}`)
    }
  } catch {
    // Swallow logging failures
  }
}

// Simple elapsed time helper
export function startTimer(): number {
  return Date.now()
}

export function elapsedMs(start: number): number {
  return Math.max(0, Date.now() - start)
}