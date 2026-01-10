import { NextResponse } from "next/server"
import { safeErrorResponse } from "@/lib/server-errors"
import { emitNotification } from "@/lib/notifications/emitter"
import { NotificationType } from "@/lib/notifications/types"

// GET /api/download?url=...&filename=...&mime=...
// Proxies an external image URL and forces download with proper headers without re-encoding
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")
    const filename = searchParams.get("filename") || "poster.png"
    const overrideMime = searchParams.get("mime") || undefined

    if (!url) {
      return NextResponse.json({ success: false, error: "Missing url" }, { status: 400 })
    }

    // Fetch original bytes
    const upstream = await fetch(url)
    if (!upstream.ok) {
      return NextResponse.json({ success: false, error: `Upstream error: ${upstream.status}` }, { status: upstream.status })
    }

    const contentType = overrideMime || upstream.headers.get("content-type") || "image/jpeg"
    const headers = new Headers()
    headers.set("Content-Type", contentType)
    headers.set("Content-Disposition", `attachment; filename="${filename.replace(/[^a-zA-Z0-9_.-]/g, "_")}"`)
    // Preserve cache headers minimally to avoid re-fetch loops
    const cacheControl = upstream.headers.get("cache-control") || "no-store"
    headers.set("Cache-Control", cacheControl)

    // Emit notification for poster download
    emitNotification({
      type: NotificationType.POSTER_DOWNLOADED,
      actor: { type: "user", identifier: "unknown" },
      summary: `Poster downloaded: ${filename}`,
      metadata: {
        poster_id: "unknown",
        template_name: filename.replace(/\.[^/.]+$/, ""), // Strip extension
        phone: "unknown",
        time: new Date().toISOString(),
      },
    }).catch(() => {
      // Silently ignore notification errors
    })

    // Stream the original body directly
    const body = upstream.body
    return new NextResponse(body, { status: 200, headers })
  } catch (err: any) {
    return await safeErrorResponse(
      "api/download",
      err,
      "Couldn’t download the file right now — please try again.",
      500,
      { endpoint: "download" },
    )
  }
}