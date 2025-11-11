import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PosterStatus } from "@/lib/status"
import { safeErrorResponse, logError } from "@/lib/server-errors"
import { logInfo, logStep, safeRedact } from "@/lib/logger"

// POST /api/make/placid-callback
// Make.com/Placid sends back the final image URL for a given session.
// This route MUST update the existing generated_posters row instead of inserting a duplicate.
// Body examples supported:
// { session_id: "uuid", image_url: "https://..." }
// { session_id: "uuid", storage_path: "https://..." }
// { session_id: "uuid", url: "https://..." }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    logStep("api/placid-callback", "request_received")
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
    }

    // Placid REST webhook payload commonly includes: id, type, status, image_url, transfer_url, polling_url, passthrough, errors
    // Validate only required fields: image_url and status
    const status: string | undefined = body.status
    const image_url: string | undefined = body.image_url || body.storage_path || body.url

    // Derive session_id if available from 'passthrough' (string or object) or legacy 'meta'
    let session_id: string | undefined = body.session_id || body.sessionId || body?.meta?.session_id || body?.meta?.sessionId
    const passthroughRaw = body?.passthrough
    if (!session_id && passthroughRaw) {
      try {
        if (typeof passthroughRaw === "string") {
          // If it's a JSON string, parse; else treat as direct session_id
          const maybeObj = JSON.parse(passthroughRaw)
          if (maybeObj && typeof maybeObj === "object") {
            session_id = maybeObj.session_id || maybeObj.sessionId
          } else if (typeof maybeObj === "string") {
            session_id = maybeObj
          }
        } else if (typeof passthroughRaw === "object") {
          session_id = passthroughRaw.session_id || passthroughRaw.sessionId
        }
      } catch (e) {
        // Non-JSON passthrough; treat as best-effort string
        if (typeof passthroughRaw === "string") session_id = passthroughRaw
      }
    }

    if (!image_url) {
      return NextResponse.json({ success: false, error: "Missing image_url" }, { status: 400 })
    }

    logInfo("api/placid-callback", "payload_parsed", {
      status,
      session_id,
      has_image_url: !!image_url,
      passthrough_keys: body?.passthrough ? Object.keys(typeof body.passthrough === "object" ? body.passthrough : {}) : [],
      raw_keys: Object.keys(body || {}),
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: "Supabase service credentials missing" }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)
    logStep("api/placid-callback", "supabase_client_initialized")

    if (session_id) {
      // Try update existing by session_id; if not found, upsert
      const { data: existingRows, error: selectErr } = await supabaseAdmin
        .from("generated_posters")
        .select("id, image_url")
        .eq("session_id", session_id)
        .limit(1)

      if (selectErr) {
        await logError({ source: "placid-callback", error: selectErr, statusCode: 500, meta: { when: "select" } })
        return NextResponse.json({ success: false, error: "Database select error" }, { status: 500 })
      }

      const existing = existingRows?.[0]

      // Idempotency: if image_url is already set and equals the incoming URL, do nothing.
      if (existing && existing.image_url && existing.image_url === image_url) {
        logInfo("api/placid-callback", "idempotent_update_skipped", { session_id })
        return NextResponse.json({ success: true, updated: false, idempotent: true }, { status: 200 })
      }

      if (existing) {
        const ok = await updatePosterUrlWithRetry(supabaseAdmin, session_id, image_url)
        if (!ok) {
          await logError({
            source: "placid-callback",
            error: new Error("Failed to persist URL"),
            statusCode: 500,
            meta: { session_id, image_url },
          })
          return NextResponse.json({ success: false, error: "Failed to persist URL" }, { status: 500 })
        }
        logStep("api/placid-callback", "update_done", { session_id })
        return NextResponse.json({ success: true, updated: true }, { status: 200 })
      }

      // Upsert by session_id; only read fields we need and ignore unknowns
      const { error: upsertErr } = await supabaseAdmin
        .from("generated_posters")
        .upsert(
          { session_id, image_url, time: new Date().toISOString(), status: PosterStatus.AWAITING_PAYMENT },
          { onConflict: "session_id" },
        )

      if (upsertErr) {
        await logError({ source: "placid-callback", error: upsertErr, statusCode: 500, meta: { when: "upsert" } })
        return NextResponse.json({ success: false, error: "Upsert error" }, { status: 500 })
      }

      const verified = await verifyPosterUrl(supabaseAdmin, session_id)
      logInfo("api/placid-callback", "upsert_done_verified", { session_id, verified })
      return NextResponse.json({ success: true, upserted: true, verified }, { status: 200 })
    }

    // If we cannot link to a session (no passthrough/meta), acknowledge success so Placid doesn't retry.
    logInfo("api/placid-callback", "ack_without_link", { body: safeRedact(body) })
    return NextResponse.json({ success: true, linked: false }, { status: 200 })
  } catch (error: any) {
    // Console logging (server errors utility already records externally)
    try { console.error(`[${new Date().toISOString()}] [api/placid-callback] ERROR`, error) } catch {}
    return safeErrorResponse(
      "api/placid-callback",
      error,
      "Couldn’t finalize your poster. We’re working on it.",
      500,
      { hint: "placid_callback", timestamp: new Date().toISOString() },
    )
  }
}

// Retry updating image_url and verify persistence
async function updatePosterUrlWithRetry(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  finalUrl: string,
  maxAttempts = 3,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error: updErr } = await supabase
      .from("generated_posters")
      .update({ image_url: finalUrl, time: new Date().toISOString(), status: PosterStatus.AWAITING_PAYMENT })
      .eq("session_id", sessionId)

    if (!updErr) {
      const ok = await verifyPosterUrl(supabase, sessionId)
      if (ok) return true
    }
    await new Promise((r) => setTimeout(r, 400 * attempt))
  }
  return false
}

async function verifyPosterUrl(supabase: ReturnType<typeof createClient>, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("generated_posters")
    .select("image_url")
    .eq("session_id", sessionId)
    .limit(1)
  if (error) {
    await logError({ source: "placid-callback", error, statusCode: 500, meta: { when: "verify" } })
    return false
  }
  return !!data?.[0]?.image_url
}
