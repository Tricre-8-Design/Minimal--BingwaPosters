
import { SupabaseClient } from "@supabase/supabase-js"
import { logInfo } from "./logger"

export const PERMANENT_TEST_SESSION_ID = "session_1769369623474_t2i10tiwa"

export function isPermanentSession(sessionId: string): boolean {
  return sessionId === PERMANENT_TEST_SESSION_ID
}

export async function fetchPermanentSessionData(supabase: SupabaseClient, sessionId: string) {
  if (!isPermanentSession(sessionId)) return null

  logInfo("lib/permanent-session", "fetching_permanent_session", { sessionId })

  const { data: poster, error: posterError } = await supabase
    .from("generated_posters")
    .select("template_id, image_url")
    .eq("session_id", sessionId)
    .single()

  if (posterError || !poster) {
    console.error("Permanent session fetch failed (poster):", posterError)
    return null
  }

  const { data: template, error: templateError } = await supabase
    .from("poster_templates")
    .select("price")
    .eq("template_id", poster.template_id)
    .single()

  if (templateError) {
      console.error("Permanent session fetch failed (template):", templateError)
  }

  return {
    templateId: poster.template_id,
    posterUrl: poster.image_url,
    price: template?.price ?? 0,
    paymentStatus: "pending",
    paymentTime: null,
    mpesaNumber: "",
    mpesaCode: "",
  }
}
