import { createBrowserClient } from "@supabase/ssr"

// Environment variables - these need to be set in your project
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const makeWebhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL!

// Validate environment variables
if (!supabaseUrl) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL is required")
}

if (!supabaseAnonKey) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
}

// Create Supabase client for browser
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Alias for legacy imports – uses the same anon client (no service-role key required)
export const supabaseAdmin = supabase

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    console.log("🔍 Testing Supabase connection...")

    // Test basic connection
    const { data, error } = await supabase.from("poster_templates").select("count", { count: "exact", head: true })

    if (error) {
      console.error("❌ Supabase connection failed:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Supabase connection successful")
    return { success: true, count: data }
  } catch (err: any) {
    console.error("❌ Supabase connection error:", err)
    return { success: false, error: err.message }
  }
}

// Database types based on the exact schema provided
export interface PosterTemplate {
  template_name: string
  template_id: string
  template_uuid: string // Required field (alias for placid_id)
  price: number
  description: string
  thumbnail: string // base64 encoded
  category: string
  fields_required: Array<{
    name: string
    label: string
    type: "text" | "textarea" | "image"
    required: boolean
  }>
}

export interface GeneratedPoster {
  id: string
  template_name: string
  template_id: string
  template_uuid: string // Required field for Placid integration
  image_url: string | null
  time: string
  session_id: string // Added session_id
}

export interface Payment {
  phone_number: string
  image_url: string | null // Can be null if payment is for something else or not linked to image yet
  mpesa_code: string
  status: "Paid" | "Pending" | "Failed" | "success" | "failed" // Added Paystack specific statuses for flexibility
  time: string
  template_id: string | null // Can be null
  session_id: string // Added session_id
  amount: number // Added amount in KES
}

export interface Feedback {
  phone_number: string
  rating: number
  comment: string
  time: string
  template_id: string
}

export interface HeroText {
  id: number
  text: string
  active: boolean
  order_position: number
  created_at: string
  updated_at: string
}

export interface Testimonial {
  id: number
  text: string
  author: string
  role: string
  rating: number
  avatar: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface SiteSetting {
  id: number
  setting_key: string
  setting_value: any
  updated_at: string
}

export interface Notification {
  id: number
  type: "info" | "warning" | "error" | "success"
  title: string
  description: string
  details?: string
  read: boolean
  created_at: string
}

// Helper function to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data:image/...;base64, prefix to get just the base64 string
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
  })
}

// Helper function to render thumbnail images properly
export const renderThumbnail = (thumbnail: string | null | undefined, altText = "Template"): string => {
  if (!thumbnail) {
    return `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(altText)}`
  }

  // If it's already a complete URL (http/https/data/blob), return as is
  if (
    thumbnail.startsWith("http") ||
    thumbnail.startsWith("data:") ||
    thumbnail.startsWith("blob:") ||
    thumbnail.startsWith("/")
  ) {
    return thumbnail
  }

  // If it's base64 data, convert to data URL
  try {
    // Test if it's valid base64
    atob(thumbnail)
    return `data:image/png;base64,${thumbnail}`
  } catch (error) {
    console.warn(`Invalid thumbnail data for ${altText}, using placeholder`)
    return `/placeholder.svg?height=300&width=400&text=${encodeURIComponent(altText)}`
  }
}

// Toast notification helper
export const showToast = (message: string, type: "success" | "error" = "error") => {
  // Create toast element
  const toastDiv = document.createElement("div")
  toastDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-in slide-in-from-right-4 duration-500 max-w-md ${
    type === "success"
      ? "bg-green-500/90 text-white border border-green-400"
      : "bg-red-500/90 text-white border border-red-400"
  }`

  // Truncate very long messages
  const displayMessage = message.length > 200 ? message.substring(0, 200) + "..." : message

  toastDiv.innerHTML = `
    <div class="flex items-start space-x-2">
      <div class="text-lg flex-shrink-0">${type === "success" ? "✅" : "⚠️"}</div>
      <div class="font-inter text-sm leading-relaxed">${displayMessage}</div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200 ml-2 flex-shrink-0">✕</button>
    </div>
  `

  document.body.appendChild(toastDiv)

  // Remove after 8 seconds (longer for error messages)
  const duration = type === "error" ? 8000 : 5000
  setTimeout(() => {
    if (toastDiv.parentElement) {
      toastDiv.classList.add("animate-out", "slide-out-to-right-4")
      setTimeout(() => {
        if (toastDiv.parentElement) {
          document.body.removeChild(toastDiv)
        }
      }, 300)
    }
  }, duration)
}

// Database health check functions
export const checkDatabaseHealth = async () => {
  const results = {
    poster_templates: false,
    generated_posters: false,
    payments: false,
    feedback: false,
    hero_texts: false,
    testimonials: false,
    site_settings: false,
    notifications: false,
  }

  const tables = Object.keys(results)

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select("*").limit(1)
      results[table as keyof typeof results] = !error
      if (error) {
        console.error(`❌ Table ${table} error:`, error.message)
      } else {
        console.log(`✅ Table ${table} accessible`)
      }
    } catch (err) {
      console.error(`❌ Table ${table} check failed:`, err)
    }
  }

  return results
}

// Function to send data to Make.com webhook
interface MakeWebhookPayload {
  session_id: string
  template_id: string
  template_name: string
  template_integromat: string // This is the template_uuid expected by Make
  user_data: Record<string, any>
  generated_poster_id?: string // Optional, if you create the record before sending to Make
  timestamp: string
  // New fields for payment details
  payment_status?: string
  mpesa_code?: string
  amount?: number
  phone_number?: string
}

export async function sendToMakeWebhook(payload: MakeWebhookPayload) {
  if (!makeWebhookUrl) {
    console.error("NEXT_PUBLIC_MAKE_WEBHOOK_URL is not set.")
    throw new Error("Webhook URL is not configured.")
  }

  try {
    const response = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Make webhook error response:", errorData)
      throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorData.message || ""}`)
    }

    console.log("Successfully sent data to Make webhook.")
    return await response.json()
  } catch (error) {
    console.error("Error sending to Make webhook:", error)
    throw error
  }
}

// Function to verify thumbnail data in database
export const verifyThumbnailData = async () => {
  try {
    const { data, error } = await supabase
      .from("poster_templates")
      .select("template_id, template_name, thumbnail")
      .limit(5)

    if (error) {
      console.error("Error fetching thumbnail data:", error)
      return
    }

    console.log("📸 Thumbnail verification:")
    data?.forEach((template) => {
      const thumbnailLength = template.thumbnail?.length || 0
      const isValidBase64 = template.thumbnail ? isValidBase64String(template.thumbnail) : false

      console.log(`- ${template.template_name}:`)
      console.log(`  - Has thumbnail: ${!!template.thumbnail}`)
      console.log(`  - Length: ${thumbnailLength} chars`)
      console.log(`  - Valid base64: ${isValidBase64}`)

      if (template.thumbnail && thumbnailLength < 100) {
        console.log(`  - Preview: ${template.thumbnail.substring(0, 50)}...`)
      }
    })
  } catch (error) {
    console.error("Error verifying thumbnail data:", error)
  }
}

// Helper function to validate base64 string
const isValidBase64String = (str: string): boolean => {
  try {
    // Remove data URL prefix if present
    const base64String = str.includes(",") ? str.split(",")[1] : str

    // Check if it's valid base64
    const decoded = atob(base64String)
    const encoded = btoa(decoded)

    return encoded === base64String
  } catch (error) {
    return false
  }
}
