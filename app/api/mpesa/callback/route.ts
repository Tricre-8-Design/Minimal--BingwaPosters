import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizePhone } from "@/lib/mpesa"
import { isValidMpesaReceipt } from "@/lib/validation"
import { safeErrorResponse } from "@/lib/server-errors"

// POST /api/mpesa/callback
// Handles Daraja STK Callback and updates payments status
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
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
    const phoneRaw = metaItems.find((i) => i.Name === "PhoneNumber")?.Value
    const accountRef = metaItems.find((i) => i.Name === "AccountReference")?.Value
    const phone = phoneRaw ? normalizePhone(String(phoneRaw)) : undefined

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
        // Also mark associated poster as COMPLETED via session_id
        if (!error && payRowByCheckout.session_id) {
          await supabaseAdmin
            .from("generated_posters")
            .update({ status: "COMPLETED" })
            .eq("session_id", String(payRowByCheckout.session_id))
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
        }
      }

    // If not linked via checkoutId above, try fallback via AccountReference
    if (updateError && accountRef) {
      await supabaseAdmin
        .from("generated_posters")
        .update({ status: "COMPLETED" })
        .eq("session_id", String(accountRef))
    }

      return NextResponse.json({ success: true, status: "Paid", receipt, checkoutId, amount })
  } else {
    // Failure: mark pending payment as failed (by checkoutId or phone)
    if (checkoutId) {
      await supabaseAdmin.from("payments").update({ status: "Failed" }).eq("mpesa_code", checkoutId)
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
      }
    }

    return NextResponse.json({ success: true, status: "Failed", resultDesc }, { status: 200 })
  }
  } catch (error: any) {
    return await safeErrorResponse(
      "api/mpesa/callback",
      error,
      "We couldn’t process the payment callback — please try again.",
      500,
      { endpoint: "mpesa/callback" },
    )
  }
}
