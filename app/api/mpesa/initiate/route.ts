import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { initiateStkPush, normalizePhone } from "@/lib/mpesa"
import { logError } from "@/lib/server-errors"

// POST /api/mpesa/initiate
// Input: { session_id, amount, phoneNumber }
// Validates and initiates STK Push, records pending payment in Supabase
export async function POST(req: Request) {
  try {
    const { session_id, phoneNumber } = await req.json()

    if (!session_id || !phoneNumber) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: "Supabase service credentials missing" }, { status: 500 })
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Validate session exists (generated_posters created) and get template_id
    const { data: posterRows, error: posterErr } = await supabaseAdmin
      .from("generated_posters")
      .select("image_url, session_id, template_id")
      .eq("session_id", session_id)
      .limit(1)

    if (posterErr) {
      await logError({ source: "api/mpesa/initiate", error: posterErr, statusCode: 500, meta: { session_id } })
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }
    if (!posterRows || posterRows.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid session_id" }, { status: 404 })
    }

    const imageUrl = posterRows[0]?.image_url || null
    const templateId = posterRows[0]?.template_id || null

    // Retrieve price from poster_templates (source of truth)
    let normalizedAmount: number | null = null
    if (templateId) {
      const { data: tpl, error: tplErr } = await supabaseAdmin
        .from("poster_templates")
        .select("price")
        .eq("template_id", templateId)
        .limit(1)
        .single()
      if (tplErr) {
        await logError({ source: "api/mpesa/initiate", error: tplErr, statusCode: 500, meta: { session_id, templateId } })
        return NextResponse.json({ success: false, error: "Failed to read template price" }, { status: 500 })
      }
      normalizedAmount = Number(tpl?.price ?? 0)
    }
    // Fallback: if templateId missing or price invalid
    if (!normalizedAmount || normalizedAmount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid or missing template price" }, { status: 400 })
    }
    const phone = normalizePhone(phoneNumber)

    // Create pending payment record
    const { data: paymentIns, error: paymentErr } = await supabaseAdmin
      .from("payments")
      .insert({
        phone_number: Number(phone),
        image_url: imageUrl,
        mpesa_code: null,
        status: "Pending",
        session_id,
        amount: normalizedAmount,
        template_id: templateId,
      })
      .select()
      .single()

    if (paymentErr) {
      await logError({ source: "api/mpesa/initiate", error: paymentErr, statusCode: 500, meta: { session_id } })
      return NextResponse.json({ success: false, error: "Failed to insert payment" }, { status: 500 })
    }

    // Initiate STK Push
    const desc = `Payment for poster generation job ${session_id}`
    const stk = await initiateStkPush({
      amount: normalizedAmount,
      phoneNumber: phone,
      accountReference: String(session_id),
      transactionDesc: desc,
    })

    const checkoutId = stk?.CheckoutRequestID
    const merchantId = stk?.MerchantRequestID
    const customerMessage = stk?.CustomerMessage

    // Update payment row with CheckoutRequestID for linking callback
    if (checkoutId) {
      const { error: updateErr } = await supabaseAdmin
        .from("payments")
        .update({ mpesa_code: checkoutId })
        .eq("id", paymentIns.id)
      if (updateErr) {
        await logError({ source: "api/mpesa/initiate", error: updateErr, statusCode: 500, meta: { payment_id: paymentIns.id } })
      }
    }

    return NextResponse.json(
      {
        success: true,
        session_id,
        amount: normalizedAmount,
        phone: phone,
        CheckoutRequestID: checkoutId,
        MerchantRequestID: merchantId,
        CustomerMessage: customerMessage,
      },
      { status: 200 },
    )
  } catch (error: any) {
    await logError({ source: "api/mpesa/initiate", error, statusCode: 500 })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
