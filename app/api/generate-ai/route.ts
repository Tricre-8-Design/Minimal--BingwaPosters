import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { injectFieldValues } from "@/lib/ai-blueprint-parser"
import Replicate from "replicate"
import { PosterStatus } from "@/lib/status"
import { checkMaintenanceStatus } from "@/lib/engine-maintenance"

/**
 * STRICT RENDERING SYSTEM PROMPT
 * 
 * Originally designed for Gemini, now adapted for Imagen.
 * Forces the AI to act as a literal renderer, not a creative designer.
 */
const RENDERING_SYSTEM_PROMPT = `You are a Poster Rendering Engine.

You do not design.
You do not improve layouts.
You do not add creativity.

Your only task is to render a poster image exactly as specified
by the provided design blueprint JSON.

------------------------------------
INPUT YOU WILL RECEIVE
------------------------------------
1. A complete design_blueprint JSON
2. All variable_text fields already resolved to final values
3. Output size and format

------------------------------------
ABSOLUTE RULES
------------------------------------
1. You must follow the blueprint exactly.
2. You must not change colors, layout, typography, spacing, or hierarchy.
3. You must not rephrase text.
4. You must not add or remove elements.
5. You must not stylize beyond what is explicitly described.
6. You must not invent missing details.

------------------------------------
TEXT RENDERING RULES
------------------------------------
- Render text exactly as provided.
- Preserve case, line breaks, and alignment.
- Static text remains unchanged.
- Variable text is already final. Do not modify it.

------------------------------------
LAYOUT RULES
------------------------------------
- Respect spatial anchors and layout zones.
- Use relative positioning as described.
- Maintain visual balance but never reinterpret structure.

------------------------------------
OUTPUT RULES
------------------------------------
- Output a single poster image.
- No explanations.
- No captions.
- No markdown.
- No JSON.
- No commentary.

If something is unclear, make the safest literal interpretation
without adding creativity.

You are a renderer, not a designer.`

/**
 * Extract all variable_text field_keys and their defaults from blueprint
 */
function extractFieldsWithDefaults(blueprint: any): Map<string, string | undefined> {
    const fields = new Map<string, string | undefined>()

    function traverse(obj: any): void {
        if (!obj || typeof obj !== "object") return

        if (obj.type === "variable_text" && obj.field_key) {
            fields.set(obj.field_key, obj.default)
        }

        for (const key in obj) {
            if (typeof obj[key] === "object") {
                if (Array.isArray(obj[key])) {
                    obj[key].forEach(traverse)
                } else {
                    traverse(obj[key])
                }
            }
        }
    }

    traverse(blueprint)
    return fields
}

/**
 * POST /api/generate-ai
 * 
 * Generates AI poster using Imagen 4 via Replicate.
 * This endpoint ONLY serves AI templates. Placid requests will be rejected.
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now()

    try {
        // Check if AI engine is under maintenance
        const maintenanceStatus = await checkMaintenanceStatus("ai")
        if (maintenanceStatus.isUnderMaintenance) {
            return NextResponse.json(
                {
                    success: false,
                    message: maintenanceStatus.message,
                    maintenance: true
                },
                { status: 503 }
            )
        }

        const body = await req.json()
        const { template_id, input_data, session_id } = body

        // ========================================
        // STEP 1: VALIDATE TEMPLATE ENGINE
        // ========================================
        if (!template_id) {
            return NextResponse.json(
                { success: false, message: "template_id is required" },
                { status: 400 }
            )
        }

        const { data: template, error: templateError } = await supabaseAdmin
            .from("poster_templates")
            .select("*")
            .eq("template_id", template_id)
            .single()

        if (templateError || !template) {
            return NextResponse.json(
                { success: false, message: "Template not found" },
                { status: 404 }
            )
        }

        // HARD FAIL: This endpoint must NEVER serve Placid
        if (template.engine_type !== "ai") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid engine type. This endpoint only serves AI templates."
                },
                { status: 400 }
            )
        }

        if (!template.ai_prompt) {
            return NextResponse.json(
                { success: false, message: "Template missing ai_prompt blueprint" },
                { status: 400 }
            )
        }

        // ========================================
        // STEP 2: VALIDATE BLUEPRINT INTEGRITY
        // ========================================
        let blueprint: any
        try {
            blueprint = typeof template.ai_prompt === "string"
                ? JSON.parse(template.ai_prompt)
                : template.ai_prompt
        } catch (err) {
            return NextResponse.json(
                { success: false, message: "Invalid blueprint JSON" },
                { status: 400 }
            )
        }

        // Extract all field keys and their defaults from blueprint
        const blueprintFields = extractFieldsWithDefaults(blueprint)

        // Build final input_data by merging user input with defaults
        const finalInputData: Record<string, string> = {}
        const missingFieldsWithoutDefaults: string[] = []

        for (const [fieldKey, defaultValue] of blueprintFields) {
            // Check if user provided this field
            const userValue = input_data?.[fieldKey]

            if (userValue && userValue.toString().trim() !== "") {
                // User provided a value - use it
                finalInputData[fieldKey] = userValue.toString()
            } else if (defaultValue !== undefined && defaultValue !== null) {
                // No user value, but blueprint has a default - use default
                finalInputData[fieldKey] = defaultValue.toString()
            } else {
                // No user value AND no default - this is an error
                missingFieldsWithoutDefaults.push(fieldKey)
            }
        }

        // Only error if fields are completely missing (no user input AND no default)
        if (missingFieldsWithoutDefaults.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Missing required fields (no default values): ${missingFieldsWithoutDefaults.join(", ")}`
                },
                { status: 400 }
            )
        }

        // ========================================
        // STEP 3: INJECT USER VALUES INTO BLUEPRINT
        // ========================================
        const renderPayload = injectFieldValues(blueprint, finalInputData)

        // ========================================
        // STEP 4: CALL NANO BANANA PRO VIA REPLICATE WITH STRICT PROMPT
        // ========================================
        const replicateApiToken = process.env.REPLICATE_API_TOKEN

        if (!replicateApiToken) {
            return NextResponse.json(
                { success: false, message: "REPLICATE_API_TOKEN not configured" },
                { status: 500 }
            )
        }

        // Initialize Replicate client
        const replicate = new Replicate({
            auth: replicateApiToken,
        })

        // Build STRICT prompt using the original Gemini-style structure
        const strictPrompt = `${RENDERING_SYSTEM_PROMPT}

------------------------------------
DESIGN BLUEPRINT (RENDER EXACTLY AS SPECIFIED)
------------------------------------
${JSON.stringify(renderPayload, null, 2)}

------------------------------------
OUTPUT FORMAT
------------------------------------
${template.aspect_ratio === "1:1" ? "Square poster, 1024x1024px" : "Horizontal poster, 1024x576px"}

------------------------------------
FINAL INSTRUCTION
------------------------------------
Recreat this poster EXACTLY as shown in the reference image.
Use the exact layout, text positioning, colors, fonts, and styling.
Replace only the variable text with the values provided in the blueprint.
Maintain all static text, colors, and design elements precisely.
This is a template rendering task, not a creative design task.`

        console.log("Sending STRICT rendering prompt to Nano Banana Pro...")
        console.log("Blueprint content:", JSON.stringify(renderPayload, null, 2))

        // Prepare image_input array (use poster_reference if available)
        const imageInput: string[] = []
        if (template.poster_reference) {
            // poster_reference already contains the full URL
            const referenceUrl = template.poster_reference
            imageInput.push(referenceUrl)
            console.log("Using reference poster:", referenceUrl)
        }

        // Call Nano Banana Pro via Replicate with reference image
        const output = await replicate.run(
            "google/nano-banana-pro",
            {
                input: {
                    prompt: strictPrompt,
                    image_input: imageInput,           // Reference poster for layout
                    aspect_ratio: template.aspect_ratio === "1:1" ? "1:1" : "16:9",
                    resolution: "2K",                  // High quality
                    output_format: "png",
                    safety_filter_level: "block_only_high"
                }
            }
        ) as any

        console.log("Replicate/Nano Banana Pro output received")

        // Imagen returns a URL to the generated image
        const imageUrl = Array.isArray(output) ? output[0] : output

        if (!imageUrl) {
            console.error("No image URL returned from Imagen")
            return NextResponse.json(
                { success: false, message: "No image generated by Imagen" },
                { status: 500 }
            )
        }

        // ========================================
        // STEP 5: DOWNLOAD AND STORE IMAGE
        // ========================================
        // Download the image from Replicate
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
            console.error("Failed to download image from Replicate")
            return NextResponse.json(
                { success: false, message: "Failed to download generated image" },
                { status: 500 }
            )
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
        const fileName = `ai-poster-${session_id || Date.now()}.png`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from("generated_posters")
            .upload(fileName, imageBuffer, {
                contentType: "image/png",
                upsert: false,
            })

        if (uploadError) {
            console.error("Storage upload error:", uploadError)
            return NextResponse.json(
                { success: false, message: "Failed to store generated image" },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
            .from("generated_posters")
            .getPublicUrl(fileName)

        const finalImageUrl = publicUrlData.publicUrl

        // Create record in generated_posters table (matching Placid flow)
        const { error: dbError } = await supabaseAdmin
            .from("generated_posters")
            .insert({
                session_id: session_id || `ai-${Date.now()}`,
                template_id: template_id,
                image_url: finalImageUrl,
                status: PosterStatus.COMPLETED  // Use the correct enum value
            })

        if (dbError) {
            console.error("Database insert error:", dbError)
            // Image is uploaded but DB failed - continue anyway
        }

        // ========================================
        // RESPONSE
        // ========================================
        const renderTime = Date.now() - startTime

        return NextResponse.json({
            success: true,
            image_url: finalImageUrl,
            render_time_ms: renderTime,
            session_id: session_id,
        })

    } catch (error: any) {
        console.error("AI Generation Error:", error)
        return NextResponse.json(
            {
                success: false,
                message: error.message || "Internal server error"
            },
            { status: 500 }
        )
    }
}
