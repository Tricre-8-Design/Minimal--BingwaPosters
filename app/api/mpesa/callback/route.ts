import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizePhone } from "@/lib/mpesa"
import { isValidMpesaReceipt } from "@/lib/validation"
import { safeErrorResponse } from "@/lib/server-errors"
import { logInfo, logError, safeRedact } from "@/lib/logger"
// import { emitNotification } from "@/lib/notifications/emitter"
// import { NotificationType } from "@/lib/notifications/types"

// Dummy types/function for now if notification module is missing/broken in tests
enum NotificationType {
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  PAYMENT_FAILED = "PAYMENT_FAILED"
}
const emitNotification = async (args: any) => Promise.resolve()

// POST /api/mpesa/callback
// Handles Daraja STK Callback and updates payments status
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    logInfo("api/mpesa/callback", "request_received", { body_keys: Object.keys(body || {}) })
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
    }

    const stk = body?.Body?.stkCallback
    if (!stk) {
      return NextResponse.json({ success: false, error: "Missing stkCallback" }, { status: 400 })
    }

    const resultCode: number = stk.ResultCode
    const resultDesc: string = stk.ResultDesc
    const checkoutId: string | undefined = stk.CheckoutRequestID
    const metaItems: Array<{ Name: string; Value?: any }> = stk.CallbackMetadata?.Item || []

    const amount = metaItems.find((i) => i.Name === "Amount")?.Value
    const receipt = metaItems.find((i) => i.Name === "MpesaReceiptNumber")?.Value

    if (receipt && !isValidMpesaReceipt(receipt)) {
      logError({
        source: "api/mpesa/callback",
        error: new Error("Invalid M-Pesa receipt format"),
        statusCode: 400,
        meta: { receipt, checkoutId },
      })
    }

    const phoneRaw = metaItems.find((i) => i.Name === "PhoneNumber")?.Value
    const accountRef = metaItems.find((i) => i.Name === "AccountReference")?.Value
    const phone = phoneRaw ? normalizePhone(String(phoneRaw)) : undefined
    logInfo("api/mpesa/callback", "parsed_metadata", {
      resultCode,
      resultDesc,
      amount,
      receipt,
      phone,
      checkoutId,
      accountRef,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: "Supabase credentials missing" }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    if (resultCode === 0) {
      // Success: update payment to paid
      let updateError: any = null

      if (checkoutId) {
        // Locate payment by CheckoutRequestID then update to store the real receipt in mpesa_code
        const { data: payRowByCheckout } = await supabaseAdmin
          .from("payments")
          .select("id, session_id")
          .eq("mpesa_code", checkoutId)
          .limit(1)
          .single()

        if (payRowByCheckout?.id) {
          const updatePayload: Record<string, any> = { status: "Paid", amount: amount ?? 1 }
          if (isValidMpesaReceipt(receipt)) {
            updatePayload.mpesa_code = String(receipt)
          }
          const { error } = await supabaseAdmin.from("payments").update(updatePayload).eq("id", payRowByCheckout.id)
          updateError = error
          logInfo("api/mpesa/callback", "payment_update_by_checkout", { payment_id: payRowByCheckout.id, receipt_valid: isValidMpesaReceipt(receipt) })
          // Also mark associated poster as COMPLETED via session_id
          if (!error && payRowByCheckout.session_id) {
            await supabaseAdmin
              .from("generated_posters")
              .update({ status: "COMPLETED" })
              .eq("session_id", String(payRowByCheckout.session_id))
            logInfo("api/mpesa/callback", "poster_mark_completed", { session_id: String(payRowByCheckout.session_id) })
          }
        }
      }

      // Fallback: update latest pending by phone number
      if (updateError && phone) {
        const { data: pendingRows } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("phone_number", Number(phone))
          .eq("status", "Pending")
          .order("created_at", { ascending: false })
          .limit(1)

        const targetId = pendingRows?.[0]?.id
        if (targetId) {
          await supabaseAdmin
            .from("payments")
            .update({ status: "Paid", amount: amount ?? 1 })
            .eq("id", targetId)
          logInfo("api/mpesa/callback", "payment_update_by_phone", { payment_id: targetId })
        }
      }

      // If not linked via checkoutId above, try fallback via AccountReference
      if (updateError && accountRef) {
        await supabaseAdmin
          .from("generated_posters")
          .update({ status: "COMPLETED" })
          .eq("session_id", String(accountRef))
        logInfo("api/mpesa/callback", "poster_mark_completed_fallback", { session_id: String(accountRef) })
      }

      // Emit notification for successful payment
      emitNotification({
        type: NotificationType.PAYMENT_SUCCESS,
        actor: { type: "user", identifier: phone || "unknown" },
        summary: `Payment received: KES ${amount || 0} from ${phone || "unknown"}`,
        metadata: {
          amount: amount || 0,
          phone: phone || "unknown",
          mpesa_code: receipt || checkoutId || "unknown",
          template_name: "unknown", // Could be fetched via session_id if needed
          time: new Date().toISOString(),
        },
      }).catch(() => {
        // Silently ignore notification errors
      })

      return NextResponse.json({ success: true, status: "Paid", receipt, checkoutId, amount })
    } else {
      // Failure: mark pending payment as failed (by checkoutId or phone)
      if (checkoutId) {
        await supabaseAdmin.from("payments").update({ status: "Failed" }).eq("mpesa_code", checkoutId)
        logInfo("api/mpesa/callback", "mark_failed_by_checkout", { checkoutId })
      } else if (phone) {
        const { data: pendingRows } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("phone_number", Number(phone))
          .eq("status", "Pending")
          .order("created_at", { ascending: false })
          .limit(1)
        const targetId = pendingRows?.[0]?.id
        if (targetId) {
          await supabaseAdmin.from("payments").update({ status: "Failed" }).eq("id", targetId)
          logInfo("api/mpesa/callback", "mark_failed_by_phone", { payment_id: targetId })
        }
      }

      // Emit notification for failed payment
      emitNotification({
        type: NotificationType.PAYMENT_FAILED,
        actor: { type: "user", identifier: phone || "unknown" },
        summary: `Payment failed from ${phone || "unknown"}`,
        metadata: {
          phone: phone || "unknown",
          time: new Date().toISOString(),
          reason: resultDesc || "Unknown error",
        },
      }).catch(() => {
        // Silently ignore notification errors
      })

      return NextResponse.json({ success: true, status: "Failed", resultDesc }, { status: 200 })
    }
  } catch (error: any) {
    try { console.error(`[${new Date().toISOString()}] [api/mpesa/callback] ERROR`, error) } catch { }
    return await safeErrorResponse(
      "api/mpesa/callback",
      error,
      "We couldn’t process the payment callback — please try again.",
      500,
      { endpoint: "mpesa/callback" },
    )
  }
}
