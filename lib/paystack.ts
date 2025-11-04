import PaystackPop from "@paystack/inline-js"

interface PaystackTransactionOptions {
  email: string
  phone: string
  amountKES: number
  sessionId: string
  templateId: string
  onSuccess: (response: any) => void
  onCancel: () => void
  onError: (error: any) => void
}

export function payWithPaystack({
  email,
  phone,
  amountKES,
  sessionId,
  templateId,
  onSuccess,
  onCancel,
  onError,
}: PaystackTransactionOptions) {
  if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
    console.error("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not set.")
    onError(new Error("Payment gateway not configured."))
    return
  }

  new PaystackPop().newTransaction({
    key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
    email,
    currency: "KES",
    amount: amountKES * 100, // Convert KES to kobo (smallest unit)
    reference: `bingwa_${Date.now()}_${sessionId}`, // Unique reference
    metadata: { sessionId, templateId, phone },
    channels: ["mobile_money"], // Force M-Pesa
    callback: onSuccess, // Fires even before webhook
    onCancel,
    onError,
  })
}
