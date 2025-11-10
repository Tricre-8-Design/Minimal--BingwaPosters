// Edge Function: weekly_report
// Purpose: Query weekly revenue from Supabase and send an SMS summary via BlazeTechScope.
// Env: Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY, BLAZE_API_KEY, BLAZE_SENDER_ID via Deno.env.

import { createClient } from "npm:@supabase/supabase-js@2"

type TransactionRow = { amount: number; status: string; created_at: string }
type SmsApiResponse = { status?: string; messageId?: string; message_id?: string; error?: string; [key: string]: unknown }

// Helper to get env vars safely
function getEnv(name: string): string | undefined {
  return Deno.env.get(name)
}

// Create Supabase client (service role)
const SUPABASE_URL = getEnv("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY")
const SENDGRID_API_KEY = getEnv("SENDGRID_API_KEY") // reserved for future email reporting
const BLAZE_API_KEY = getEnv("BLAZE_API_KEY")
const BLAZE_SENDER_ID = getEnv("BLAZE_SENDER_ID")

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null

// Send SMS via BlazeTechScope API
async function sendSms(apiKey: string, senderId: string, message: string, recipients: string[]): Promise<boolean> {
  try {
    const payload = { sender_id: senderId, message, recipients }
    const response: Response = await fetch("https://sms.blazetechscope.com/v1/bulksms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey,
      },
      body: JSON.stringify(payload),
    })

    const bodyText = await response.text()
    let parsed: SmsApiResponse | null = null
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      parsed = null
    }

    const messageId = parsed?.messageId ?? parsed?.message_id ?? null
    // Internal logs only (server-side): status and optional message ID
    console.log("weekly_report: Blaze SMS response", { status: response.status, ok: response.ok, messageId })

    return response.ok
  } catch (err) {
    console.error("weekly_report: Blaze SMS request error", err)
    return false
  }
}

Deno.serve(async () => {
  try {
    // Validate required environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BLAZE_API_KEY || !BLAZE_SENDER_ID) {
      console.error("weekly_report: Missing environment variables", {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
        BLAZE_API_KEY: Boolean(BLAZE_API_KEY),
        BLAZE_SENDER_ID: Boolean(BLAZE_SENDER_ID),
      })
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      })
    }

    if (!supabase) {
      console.error("weekly_report: Supabase client not initialized")
      return new Response(JSON.stringify({ error: "Initialization failed" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      })
    }

    // Compute date range for the last 7 days
    const startDateIso: string = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Query successful transactions in the last week
    const { data, error, count } = await supabase
      .from("transactions")
      .select("amount, status, created_at", { count: "exact" })
      .eq("status", "SUCCESS")
      .gte("created_at", startDateIso)

    if (error) {
      console.error("weekly_report: Supabase query failed", { message: error.message, details: (error as any)?.details })
      // Abort; do not send SMS if query fails
      return new Response(JSON.stringify({ error: "Query failed" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      })
    }

    const rows: TransactionRow[] = (data ?? []) as TransactionRow[]
    const total: number = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
    const successfulCount: number = typeof count === "number" ? count : rows.length

    const message: string = `BingwaPosters Weekly Report: KSh ${Math.round(total)} from ${successfulCount} transactions.`
    const recipients: string[] = ["+254727921038", "+254717444266"]

    // Send SMS and retry once on failure
    const sent = await sendSms(BLAZE_API_KEY, BLAZE_SENDER_ID, message, recipients)
    if (!sent) {
      const retry = await sendSms(BLAZE_API_KEY, BLAZE_SENDER_ID, message, recipients)
      if (!retry) {
        console.error("weekly_report: SMS failed after retry")
        return new Response(JSON.stringify({ error: "SMS failed" }), {
          headers: { "Content-Type": "application/json" },
          status: 502,
        })
      }
    }

    // Success response
    return new Response(JSON.stringify({ success: true, total }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (err) {
    console.error("weekly_report: Unexpected error", err)
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})