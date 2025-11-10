import { createClient } from "@supabase/supabase-js"

// Storage helpers for uploading images to Supabase 'assets' bucket
// - Supports DataURL strings (e.g., data:image/png;base64,...)
// - Generates deterministic file names using sessionId + fieldName + timestamp
// - Returns public URLs for use with Placid layers

// Lazily create Supabase admin client to avoid build-time env access
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service credentials missing")
  }
  return createClient(supabaseUrl, serviceKey)
}

function sanitizeName(input: string) {
  return input.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase()
}

function parseDataUrl(dataUrl: string): { mime: string; ext: string; base64: string } {
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i)
  if (!match) {
    throw new Error("Invalid image DataURL. Expected base64 PNG/JPEG.")
  }
  const mime = match[1].toLowerCase()
  const subtype = match[2].toLowerCase()
  const ext = subtype === "jpg" ? "jpg" : subtype // jpeg|jpg|png
  const base64 = match[3]
  return { mime, ext, base64 }
}

export async function uploadDataUrlToAssets(
  dataUrl: string,
  {
    sessionId,
    fieldName,
  }: {
    sessionId: string
    fieldName: string
  },
): Promise<{ path: string; publicUrl: string }> {
  const supabaseAdmin = getSupabaseAdmin()

  const { mime, ext, base64 } = parseDataUrl(dataUrl)
  const buffer = Buffer.from(base64, "base64")

  const safeSession = sanitizeName(sessionId)
  const safeField = sanitizeName(fieldName)
  const fileName = `${safeField}-${Date.now()}.${ext}`
  const path = `sessions/${safeSession}/${fileName}`

  const { error: uploadErr } = await supabaseAdmin.storage.from("assets").upload(path, buffer, {
    contentType: mime,
    upsert: true,
  })

  if (uploadErr) {
    throw new Error(`Failed to upload ${fieldName} image: ${uploadErr.message}`)
  }

  const { data } = supabaseAdmin.storage.from("assets").getPublicUrl(path)
  const publicUrl = data?.publicUrl
  if (!publicUrl) {
    throw new Error("Failed to resolve public URL for uploaded image")
  }

  return { path, publicUrl }
}

// Resolve a public URL for a given path or return the original URL if already absolute
export function resolveAssetPublicUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return ""
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("data:")) {
    return pathOrUrl
  }
  const cleaned = pathOrUrl.replace(/^\/+/, "")
  const supabaseAdmin = getSupabaseAdmin()
  const { data } = supabaseAdmin.storage.from("assets").getPublicUrl(cleaned)
  return data?.publicUrl || pathOrUrl
}

