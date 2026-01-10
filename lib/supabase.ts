import { createBrowserClient } from "@supabase/ssr"

// Lazy Supabase client to avoid build-time env access
// Creates the browser client only when first used at runtime.
let cachedClient: ReturnType<typeof createBrowserClient> | null = null

function ensureClient(): ReturnType<typeof createBrowserClient> {
  if (cachedClient) return cachedClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    // Throw only when actually used at runtime; avoids build-time failures
    throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing")
  }
  cachedClient = createBrowserClient(url, anon)
  return cachedClient
}

// Proxy exposes the same interface while deferring client creation until used
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = ensureClient() as any
      const value = client[prop]
      return typeof value === "function" ? value.bind(client) : value
    },
  },
) as ReturnType<typeof createBrowserClient>

// Server-side admin client (for API routes only!)
import { createClient } from "@supabase/supabase-js"

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    // Test basic connection
    const { data, error } = await supabase.from("poster_templates").select("count", { count: "exact", head: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, count: data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Database types based on the exact schema provided
export interface PosterTemplate {
  template_name: string
  template_id: string
  template_uuid: string | null // Nullable for AI templates
  engine_type: "placid" | "ai" // 'placid' or 'ai'
  ai_prompt: any | null // JSON for AI blueprint
  ai_model: string | null
  aspect_ratio: string | null
  price: number
  tag: string | null
  is_active: boolean
  thumbnail_path: string | null
  category: string
  poster_reference: string | null // For AI Poster Blueprint reference image
  fields_required: Array<{
    name: string
    label: string
    type: "text" | "textarea" | "image"
    required: boolean
    json_path?: string // Required for AI templates
  }>
}

export interface GeneratedPoster {
  id: string
  template_name: string
  template_id: string
  template_uuid: string // Required field for Placid integration
  image_url: string | null
  // Legacy update timestamp
  time?: string
  // Creation timestamp
  created_at: string
  session_id: string // Added session_id
}

export interface Payment {
  phone_number: string
  image_url: string | null // Can be null if payment is for something else or not linked to image yet
  mpesa_code: string
  status: "Paid" | "Pending" | "Failed" // Standardized M-Pesa payment statuses
  // Legacy update timestamp (may be absent)
  time?: string
  // Creation timestamp
  created_at: string
  template_id: string | null // Can be null
  session_id: string // Added session_id
  amount: number // Added amount in KES
}

export interface Feedback {
  phone_number: string
  rating: number
  comment: string
  // Legacy update timestamp (may be absent)
  time?: string
  // Creation timestamp
  created_at: string
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
// Public URL helper for thumbnails stored in Supabase Storage
export const getThumbnailUrl = (thumbnailPath?: string | null): string => {
  // Returns a public URL for a thumbnail stored in the 'templates-thumbnails' bucket
  // Accepts either a relative storage path or an absolute public URL; normalizes input safely.
  if (!thumbnailPath) return "/placeholder.svg"

  // If already a complete URL or data/blob URL, return as-is
  if (
    typeof thumbnailPath === "string" &&
    (thumbnailPath.startsWith("http") || thumbnailPath.startsWith("data:") || thumbnailPath.startsWith("blob:"))
  ) {
    return thumbnailPath
  }

  // Normalize path: strip leading slashes and bucket prefix if present
  let normalizedPath = thumbnailPath.trim()
  // remove accidental quotes
  normalizedPath = normalizedPath.replace(/^"|"$/g, "").replace(/^'|'$/g, "")
  normalizedPath = normalizedPath.replace(/^\/+/, "")
  normalizedPath = normalizedPath.replace(/^templates-thumbnails\//, "")
  normalizedPath = normalizedPath.replace(/^public\//, "")
  normalizedPath = normalizedPath.replace(/^storage\//, "")

  // Some legacy records may store only a file name; ensure directory prefix
  if (!normalizedPath.includes("/")) {
    normalizedPath = `thumbnails/${normalizedPath}`
  }

  // Ensure we use a URI-safe path
  const safePath = normalizedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  const { data } = supabase.storage.from("templates-thumbnails").getPublicUrl(safePath)
  return data?.publicUrl || "/placeholder.svg"
}

// Helper function to render thumbnail images properly
// Removed legacy base64 thumbnail rendering in favor of Storage public URLs

// Toast notification helper
export const showToast = (message: string, type: "success" | "error" = "error") => {
  // Create toast element
  const toastDiv = document.createElement("div")
  toastDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-md animate-in slide-in-from-right-4 duration-500 max-w-md ${type === "success"
    ? "bg-success text-text-inverse border border-border"
    : "bg-danger text-text-inverse border border-border"
    }`

  // Truncate very long messages
  const displayMessage = message.length > 200 ? message.substring(0, 200) + "..." : message

  toastDiv.innerHTML = `
    <div class="flex items-start space-x-2">
      <div class="text-lg flex-shrink-0">${type === "success" ? "✅" : "⚠️"}</div>
      <div class="font-inter text-sm leading-relaxed">${displayMessage}</div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-text-inverse hover:text-text-muted ml-2 flex-shrink-0">✕</button>
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
      // silently record table accessibility in results without console output
    } catch (err) {
      // swallow errors to avoid exposing internal checks
    }
  }

  return results
}

// Removed legacy Make.com webhook helpers and env vars. Direct Placid REST integration is used.

// Function to verify thumbnail data in database
// Removed legacy thumbnail verification utility tied to base64

// Helper function to validate base64 string
// Removed legacy base64 validator
