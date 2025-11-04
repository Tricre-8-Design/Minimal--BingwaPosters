// Make.com webhook integration

export interface MakeWebhookPayload {
  template_name: string
  templateId: string
  fields: Record<string, any>
}

export const sendToMakeWebhook = async (payload: MakeWebhookPayload) => {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL
    if (!webhookUrl) {
      console.error("❌ NEXT_PUBLIC_MAKE_WEBHOOK_URL is not configured")
      return { success: false, error: "Make webhook URL not configured" }
    }

    // Ensure payload matches the new required format
    const formattedPayload = {
      template_name: payload.template_name,
      templateId: payload.templateId,
      fields: payload.fields
    }

    console.log("📡 Sending to Make webhook:", webhookUrl)
    console.log("📦 Payload:", JSON.stringify(formattedPayload, null, 2))

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formattedPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Make webhook failed:", response.status, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    // Check content type before parsing
    const isJson = response.headers.get("content-type")?.includes("application/json")
    const result = isJson ? await response.json() : await response.text()

    console.log("✅ Make webhook success:", result)
    return { success: true, data: result }
  } catch (error: any) {
    console.error("❌ Make webhook error:", error)
    return { success: false, error: error.message }
  }
}

export const testMakeWebhook = async () => {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL
    if (!webhookUrl) {
      return { success: false, error: "Make webhook URL not configured" }
    }

    // Send a test payload in the new format
    const testPayload = {
      templateId: "test-template-id",
      fields;json: {
        field_name_1: "value_1",
        field_name_2: "value_2",
        field_name_3: "value_3"
      }
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    // Check content type before parsing
    const isJson = response.headers.get("content-type")?.includes("application/json")
    const result = isJson ? await response.json() : await response.text()

    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
