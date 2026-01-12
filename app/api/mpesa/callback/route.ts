import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizePhone } from "@/lib/pesaflux"
import { safeErrorResponse } from "@/lib/server-errors"
import { logInfo } from "@/lib/logger"
import { emitNotification } from "@/lib/notifications/emitter"
import { NotificationType } from "@/lib/notifications/types"

// POST /api/mpesa/callback
// Handles PesaFlux Webhook and updates payments status
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    logInfo("api/mpesa/callback", "request_received", { body_keys: Object.keys(body || {}), body })

    // PesaFlux Payload Structure:
    // {
    //   "ResponseCode": 0,
    //   "ResponseDescription": "Success...",
    //   "MerchantRequestID": "...",
    //   "CheckoutRequestID": "...",
    //   "TransactionID": "SOFTPID...", // matches what initiate returned as transaction_request_id
    //   "TransactionAmount": 100,
    //   "TransactionReceipt": "SIS88JC7AM",
    //   "TransactionDate": "...",
    //   "TransactionReference": "...",
    //   "Msisdn": "..."
    // }

    if (!body || typeof body.ResponseCode === 'undefined') {
      return NextResponse.json({ success: false, error: "Invalid JSON or missing ResponseCode" }, { status: 400 })
    }

    const {
      ResponseCode,
      ResponseDescription,
      TransactionID, // This correlates to 'transaction_request_id' we stored in mpesa_code
      TransactionAmount,
      TransactionReceipt,
      Msisdn,
    } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: "Supabase credentials missing" }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)
    const phone = Msisdn ? normalizePhone(String(Msisdn)) : undefined

    if (ResponseCode === 0 || ResponseCode === "0") {
      // Success
      let updateError: any = null

      if (TransactionID) {
        // Find payment by mpesa_code (which currently holds the TransactionID/RequestID)
        const { data: payRow } = await supabaseAdmin
          .from("payments")
          .select("id, session_id")
          .eq("mpesa_code", TransactionID)
          .limit(1)
          .single()

        if (payRow?.id) {
          // Update to Paid and set mpesa_code to the actual receipt
          const { error } = await supabaseAdmin
            .from("payments")
            .update({
              status: "Paid",
              amount: TransactionAmount,
              mpesa_code: TransactionReceipt // Overwrite RequestID with actual Receipt
            })
            .eq("id", payRow.id)

          updateError = error
          logInfo("api/mpesa/callback", "payment_update_by_tid", { payment_id: payRow.id, receipt: TransactionReceipt })

          if (!error && payRow.session_id) {
            await supabaseAdmin
              .from("generated_posters")
              .update({ status: "COMPLETED" })
              .eq("session_id", String(payRow.session_id))
          }
        } else {
          // Fallback: Could not find by TransactionID, try searching by phone + pending
          // NOTE: PesaFlux might return different ID or we didn't save it correctly.
          logInfo("api/mpesa/callback", "tid_not_found", { TransactionID })
        }
      }

      // Fallback: update latest pending by phone number if we didn't match ID or ID was missing
      if ((!TransactionID || updateError) && phone) {
        const { data: pendingRows } = await supabaseAdmin
          .from("payments")
          .select("id, session_id")
          .eq("phone_number", Number(phone))
          .eq("status", "Pending")
          .order("created_at", { ascending: false })
          .limit(1)

        const target = pendingRows?.[0]
        if (target) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: "Paid",
              amount: TransactionAmount,
              mpesa_code: TransactionReceipt || TransactionID
            })
            .eq("id", target.id)
          logInfo("api/mpesa/callback", "payment_update_by_phone", { payment_id: target.id })

          if (target.session_id) {
            await supabaseAdmin
              .from("generated_posters")
              .update({ status: "COMPLETED" })
              .eq("session_id", String(target.session_id))
          }
        }
      }

      // Emit notification
      emitNotification({
        type: NotificationType.PAYMENT_SUCCESS,
        actor: { type: "user", identifier: phone || "unknown" },
        summary: `Payment received: KES ${TransactionAmount || 0} from ${phone || "unknown"}`,
        metadata: {
          amount: TransactionAmount || 0,
          phone: phone || "unknown",
          mpesa_code: TransactionReceipt || TransactionID || "unknown",
          time: new Date().toISOString(),
        },
      }).catch(() => { })

      return NextResponse.json({ success: true, message: "Payment processed" })

    } else {
      // Failure
      if (TransactionID) {
        await supabaseAdmin.from("payments").update({ status: "Failed" }).eq("mpesa_code", TransactionID)
      } else if (phone) {
        const { data: pendingRows } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("phone_number", Number(phone))
          .eq("status", "Pending")
          .order("created_at", { ascending: false })
          .limit(1)
        if (pendingRows?.[0]?.id) {
          await supabaseAdmin.from("payments").update({ status: "Failed" }).eq("id", pendingRows[0].id)
        }
      }

      emitNotification({
        type: NotificationType.PAYMENT_FAILED,
        actor: { type: "user", identifier: phone || "unknown" },
        summary: `Payment failed from ${phone || "unknown"}`,
        metadata: {
          phone: phone || "unknown",
          time: new Date().toISOString(),
          reason: ResponseDescription || "Unknown error",
        },
      }).catch(() => { })

      // Return 200 to acknowledge receipt even on failure
      return NextResponse.json({ success: true, message: "Failure logged" })
    }

  } catch (error: any) {
    try { console.error(`[${new Date().toISOString()}] [api/mpesa/callback] ERROR`, error) } catch { }
    return await safeErrorResponse(
      "api/mpesa/callback",
      error,
      "We couldn’t process the payment callback.",
      500,
      { endpoint: "mpesa/callback" },
    )
  }
}
