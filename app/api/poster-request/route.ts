import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { emitNotification } from "@/lib/notifications/emitter"
import { NotificationType } from "@/lib/notifications/types"
import { logInfo, logError } from "@/lib/logger"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { poster_url, description, phone_number } = body

    if (!poster_url) {
      return NextResponse.json({ success: false, error: "Poster URL is required" }, { status: 400 })
    }

    logInfo("api/poster-request", "submission_start", { phone_number })

    // 1. Save to database using admin client to bypass RLS if needed
    // (Though we set up anonymous insert, using admin client here is safer for the API flow)
    const { data, error: dbError } = await supabaseAdmin
      .from("poster_requests")
      .insert({
        poster_url,
        description,
        phone_number,
        status: "pending"
      })
      .select()
      .single()

    if (dbError) {
      logError("api/poster-request", dbError)
      return NextResponse.json({ success: false, error: "Failed to save request" }, { status: 500 })
    }

    // 2. Emit notification
    await emitNotification({
      type: NotificationType.POSTER_REQUEST_SUBMITTED,
      actor: {
        type: "user",
        identifier: phone_number || "Anonymous"
      },
      summary: `New poster request submitted: ${description?.substring(0, 50) || "No description"}`,
      metadata: {
        request_id: data.id,
        poster_url,
        description,
        phone_number
      }
    })

    logInfo("api/poster-request", "submission_success", { request_id: data.id })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    logError("api/poster-request", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
