import { NextResponse } from "next/server"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
import { createClient } from "@supabase/supabase-js"
import { uploadDataUrlToAssets, resolveAssetPublicUrl } from "@/lib/storage"
import { PosterStatus, type PosterStatusType } from "@/lib/status"
import { safeErrorResponse } from "@/lib/server-errors"

// POST /api/generate
// Input: { template_id, input_data, session_id }
// Calls Placid REST API directly and writes result to Supabase

export async function POST(req: Request) {
  try {
    const { template_uuid, input_data, session_id, template_id } = await req.json()

    // Incoming request parsed successfully

    if (!template_uuid || !input_data || !session_id) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const placidKey = process.env.PLACID_API_KEY
    if (!placidKey) {
      return NextResponse.json({ success: false, error: "PLACID_API_KEY not configured" }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Fetch template to know which fields are images and to get template_name
    let templateRow: any = null
    if (template_id) {
      const { data: tRow } = await supabaseAdmin
        .from("poster_templates")
        .select("template_name, fields_required, template_id, template_uuid")
        .eq("template_id", template_id)
        .limit(1)
        .single()
      templateRow = tRow || null
    }
    if (!templateRow && template_uuid) {
      const { data: tRow2 } = await supabaseAdmin
        .from("poster_templates")
        .select("template_name, fields_required, template_id, template_uuid")
        .eq("template_uuid", template_uuid)
        .limit(1)
        .single()
      templateRow = tRow2 || null
    }
    const templateName = templateRow?.template_name || null
    const fieldsRequired: Array<{ name: string; type: string }> = templateRow?.fields_required || []

    // Build Placid layers payload and upload images to Storage when needed
    const layers: Record<string, any> = {}
    const imageFieldNames = new Set(
      fieldsRequired.filter((f) => f.type === "image").map((f) => String(f.name)),
    )

    if (input_data && typeof input_data === "object") {
      for (const [key, val] of Object.entries(input_data)) {
        try {
          if (imageFieldNames.has(key)) {
            // Placid expects image layers to use the key `image` with a public URL
            if (typeof val === "string" && val.startsWith("data:image")) {
              const { publicUrl } = await uploadDataUrlToAssets(val, { sessionId: session_id, fieldName: key })
              layers[key] = { image: publicUrl }
            } else if (typeof val === "string") {
              const resolved = resolveAssetPublicUrl(val)
              layers[key] = { image: resolved }
            } else {
              layers[key] = { image: "" }
            }
          } else {
            // Treat as text layers
            if (val === null || val === undefined) {
              layers[key] = { text: "" }
            } else {
              layers[key] = { text: String(val) }
            }
          }
        } catch (e: any) {
          // Fallback to empty text/image
          layers[key] = imageFieldNames.has(key) ? { image: "" } : { text: "" }
        }
      }
    }
    // Layers prepared

    // Call Placid 2.0 REST API to generate image
    const placidResponse = await fetch("https://api.placid.app/api/rest/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${placidKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_uuid,
        layers,
        // Provide webhook_success so Placid can call back with final URL
        webhook_success: process.env.PLACID_WEBHOOK_SUCCESS_URL,
        // Include passthrough for reliable linking in webhook payload
        passthrough: JSON.stringify({ session_id, template_id: template_id ?? null, template_uuid }),
        // Include meta so callback can identify session and template context
        meta: {
          session_id,
          template_id: template_id ?? null,
          template_uuid,
        },
      }),
    })

    const placidData = await placidResponse.json().catch(() => ({}))
    if (!placidResponse.ok) {
      const message = placidData?.error || placidResponse.statusText
      // Attempt to record failure in Supabase
      await writePoster({ session_id, template_id, template_uuid, image_url: null, status: PosterStatus.FAILED })
      throw new Error(`Placid API Error: ${message}`)
    }

    // Extract id, url, status from response (handle possible nested data)
    const data = placidData?.data || placidData
    const id = data?.id
    const url = data?.url || data?.download_url || data?.result_url || data?.image?.url || null
    // Save result to Supabase and include template_name and status
    await writePoster({
      session_id,
      template_id,
      template_uuid,
      template_name: templateName,
      image_url: url,
      // New flow: initial status is PENDING; when image becomes available, we gate with AWAITING_PAYMENT
      status: url ? PosterStatus.AWAITING_PAYMENT : PosterStatus.PENDING,
    })

    return NextResponse.json({ success: true, image_url: url, session_id })
  } catch (error: any) {
    return await safeErrorResponse(
      "api/generate",
      error,
      "Couldn’t generate your poster right now — please try again.",
      500,
      { hint: "placid_generate", timestamp: new Date().toISOString() },
    )
  }
}

// Helper to write poster record using Supabase Service Role
async function writePoster({
  session_id,
  template_id,
  template_uuid,
  template_name,
  image_url,
  status,
}: {
  session_id: string
  template_id?: string
  template_uuid?: string
  template_name?: string | null
  image_url: string | null
  status?: PosterStatusType
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service credentials missing")
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  // Write poster record to Supabase

  // Upsert poster record by session_id to prevent duplicate key errors
  const { error } = await supabaseAdmin
    .from("generated_posters")
    .upsert(
      {
        session_id,
        template_id: template_id ?? null,
        template_uuid: template_uuid ?? null,
        template_name: template_name ?? null,
        image_url,
        status: status ?? null,
        time: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    )

  if (error) {
    throw error
  }
}
