import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Import the sendToMakeWebhook function
import { sendToMakeWebhook } from "@/lib/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Supabase URL or Service Role Key is not set for webhook.")
  // In a real app, you might want to throw an error or handle this more gracefully
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(req: NextRequest) {
  try {
    const event = await req.json()
    console.log("Received Paystack webhook event:", event.event)

    if (event.event === "charge.success") {
      const trx = event.data // full transaction object
      const { metadata, customer, reference, amount, status } = trx

      const sessionId = metadata?.sessionId
      const templateId = metadata?.templateId
      const phone = customer?.phone
      const mpesaCode = reference // Paystack reference can be used as mpesa_code
      const amountKES = amount / 100 // Convert kobo back to KES

      if (!sessionId || !templateId || !phone || !mpesaCode || amountKES === undefined || !status) {
        console.error("Missing required data in Paystack webhook payload:", trx)
        return NextResponse.json({ error: "Missing required data" }, { status: 400 })
      }

      // Insert or update payments table
      const { data, error } = await supabaseAdmin
        .from("payments")
        .upsert(
          {
            session_id: sessionId, // Assuming session_id is a unique identifier or part of a composite key
            phone_number: phone,
            mpesa_code: mpesaCode,
            amount: amountKES,
            status: status === "success" ? "Paid" : "Failed", // Map Paystack status to your enum
            time: new Date().toISOString(),
            template_id: templateId,
            image_url: metadata?.posterUrl || null, // Assuming posterUrl might be in metadata
          },
          { onConflict: "session_id", ignoreDuplicates: false }, // Update if session_id exists
        )
        .select()
        .single()

      if (error) {
        console.error("Error upserting payment to Supabase:", error)
        return NextResponse.json({ error: "Database update failed", details: error.message }, { status: 500 })
      }

      console.log("Payment record updated in Supabase:", data)

      // Send payment status and details to Make webhook
      try {
        await sendToMakeWebhook({
          session_id: sessionId,
          template_id: templateId,
          template_name: metadata?.templateName || "N/A", // Assuming templateName might be in metadata
          template_integromat: metadata?.template_uuid || "N/A", // Assuming template_uuid might be in metadata
          user_data: metadata?.userData || {}, // Assuming user_data might be in metadata
          generated_poster_id: metadata?.generatedPosterId || undefined, // Assuming generatedPosterId might be in metadata
          timestamp: new Date().toISOString(),
          payment_status: status, // Add Paystack status
          mpesa_code: mpesaCode,
          amount: amountKES,
          phone_number: phone,
        })
        console.log("Successfully forwarded to Make webhook.")
      } catch (makeError) {
        console.error("Error forwarding to Make webhook:", makeError)
        // Don't fail the Paystack webhook if Make fails, just log
      }

      return NextResponse.json({ received: true, data }, { status: 200 })
    } else {
      console.log("Unhandled Paystack event type:", event.event)
      return NextResponse.json({ received: true, message: "Event type not handled" }, { status: 200 })
    }
  } catch (error) {
    console.error("Error processing Paystack webhook:", error)
    return NextResponse.json({ error: "Internal Server Error", details: (error as Error).message }, { status: 500 })
  }
}
