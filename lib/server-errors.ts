import { NextResponse } from "next/server"

// Server-side error utilities
// - logError: writes detailed errors to Supabase (private table) or webhook
// - safeErrorResponse: returns sanitized JSON to clients while logging full details
// - getFriendlyMessage: maps raw errors to pleasant user messages

type LogMeta = Record<string, any>

function getEnv(name: string): string | undefined {
  try {
    return process.env[name]
  } catch {
    return undefined
  }
}

export function getFriendlyMessage(defaultMessage = "Something went wrong. Please try again."): string {
  // Keep simple and non-technical for users
  return defaultMessage
}

export async function logError({
  source,
  error,
  statusCode,
  requestId,
  meta,
}: {
  source: string
  error: any
  statusCode?: number
  requestId?: string
  meta?: LogMeta
}): Promise<void> {
  const message: string = String(error?.message || error || "Unknown error")
  const name: string | undefined = error?.name
  const stack: string | undefined = error?.stack

  // Avoid noisy server console; rely on webhook/Supabase for logging

  const webhook = getEnv("LOG_WEBHOOK_URL")
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")

  // Try webhook first if configured
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "error",
          source,
          statusCode: statusCode ?? 500,
          requestId,
          message,
          name,
          stack,
          meta: meta ?? null,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (e) {
      // Silently ignore webhook logging failures
    }
  }

  // Fallback to Supabase private table if service role available
  if (supabaseUrl && serviceKey) {
    try {
      // Use dynamic import to avoid bundling supabase-js into Edge Runtime (e.g., middleware)
      const isNode = (() => {
        try {
          return typeof process !== "undefined" && !!process.versions?.node
        } catch {
          return false
        }
      })()

      if (!isNode) {
        // In Edge runtime, skip Supabase fallback to avoid Node-only APIs
        return
      }

      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(supabaseUrl, serviceKey)
      await supabase.from("error_logs").insert({
        source,
        status_code: statusCode ?? 500,
        request_id: requestId ?? null,
        message,
        name: name ?? null,
        stack: stack ?? null,
        meta: meta ?? null,
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      // Silently ignore Supabase logging failures
    }
  }
}

export async function safeErrorResponse(
  source: string,
  error: any,
  userMessage = "Sorry, something went wrong. Please try again.",
  statusCode = 500,
  meta?: LogMeta,
) {
  await logError({ source, error, statusCode, meta })
  const message = getFriendlyMessage(userMessage)
  return NextResponse.json({ success: false, message }, { status: statusCode })
}