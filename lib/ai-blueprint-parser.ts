/**
 * AI Blueprint Parser
 * 
 * Extracts dynamic form fields from AI poster blueprint JSON.
 * ONLY applies to templates with engine_type === "ai".
 * 
 * CRITICAL: Do NOT apply this logic to Placid templates.
 */

export interface ExtractedField {
    field_key: string
    label: string
    input_type: "text" | "textarea" | "image"
    required: boolean
    placeholder: string
    default_value: string
    group?: string
}

interface VariableTextBlock {
    type: "variable_text"
    field_key: string
    default: string
    [key: string]: any
}

interface ContentBlock {
    type: string
    content_blocks?: ContentBlock[]
    [key: string]: any
}

interface BlueprintComponent {
    id?: string
    component?: {
        id?: string
    }
    layout_zone?: {
        zone_id?: string
    }
    content_blocks?: ContentBlock[]
    [key: string]: any
}

/**
 * Recursively traverse the blueprint to find all variable_text blocks
 */
function traverseBlueprint(
    obj: any,
    parentGroup: string | null = null,
    fields: ExtractedField[] = []
): ExtractedField[] {
    if (!obj || typeof obj !== "object") {
        return fields
    }

    // Determine current group context
    let currentGroup = parentGroup
    if (obj.component?.id) {
        currentGroup = obj.component.id
    } else if (obj.layout_zone?.zone_id) {
        currentGroup = obj.layout_zone.zone_id
    } else if (obj.id && typeof obj.id === "string") {
        currentGroup = obj.id
    }

    // Check if this is a variable_text block
    if (obj.type === "variable_text" && obj.field_key && obj.default !== undefined) {
        const fieldKey = obj.field_key as string

        // Check for duplicates
        if (fields.some(f => f.field_key === fieldKey)) {
            throw new Error(`Duplicate field_key found: "${fieldKey}"`)
        }

        const field: ExtractedField = {
            field_key: fieldKey,
            label: humanizeFieldKey(fieldKey),
            input_type: "text", // Default to text
            required: true,
            placeholder: obj.default,
            default_value: obj.default,
            group: currentGroup ? humanizeFieldKey(currentGroup) : undefined,
        }

        fields.push(field)
    }

    // Recurse through content_blocks
    if (Array.isArray(obj.content_blocks)) {
        for (const block of obj.content_blocks) {
            traverseBlueprint(block, currentGroup, fields)
        }
    }

    // Recurse through all object properties
    for (const key in obj) {
        if (key !== "content_blocks" && typeof obj[key] === "object") {
            if (Array.isArray(obj[key])) {
                for (const item of obj[key]) {
                    traverseBlueprint(item, currentGroup, fields)
                }
            } else {
                traverseBlueprint(obj[key], currentGroup, fields)
            }
        }
    }

    return fields
}

/**
 * Convert snake_case or camelCase to Title Case
 */
function humanizeFieldKey(key: string): string {
    return key
        .replace(/[_-]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
}

/**
 * Extract form fields from AI blueprint JSON
 * 
 * @param blueprintJson - The ai_prompt JSON object
 * @returns Array of extracted fields
 * @throws Error if blueprint is invalid or contains duplicate field_key values
 */
export function extractFieldsFromBlueprint(blueprintJson: any): ExtractedField[] {
    if (!blueprintJson) {
        throw new Error("Blueprint JSON is required")
    }

    const fields: ExtractedField[] = []
    traverseBlueprint(blueprintJson, null, fields)

    if (fields.length === 0) {
        throw new Error("No variable_text fields found in blueprint")
    }

    return fields
}

/**
 * Group fields by their group property
 */
export function groupFields(fields: ExtractedField[]): Record<string, ExtractedField[]> {
    const grouped: Record<string, ExtractedField[]> = {}

    for (const field of fields) {
        const group = field.group || "General"
        if (!grouped[group]) {
            grouped[group] = []
        }
        grouped[group].push(field)
    }

    return grouped
}

/**
 * Inject user input into blueprint by replacing default values
 * 
 * @param blueprint - Original blueprint JSON
 * @param fieldValues - User input as { field_key: value }
 * @returns Modified blueprint with injected values
 */
export function injectFieldValues(blueprint: any, fieldValues: Record<string, string>): any {
    if (!blueprint || typeof blueprint !== "object") {
        return blueprint
    }

    // Clone to avoid mutation
    const cloned = JSON.parse(JSON.stringify(blueprint))

    function inject(obj: any): void {
        if (!obj || typeof obj !== "object") {
            return
        }

        // If this is a variable_text block, replace default with user value
        if (obj.type === "variable_text" && obj.field_key) {
            const userValue = fieldValues[obj.field_key]
            if (userValue !== undefined) {
                obj.default = userValue
            }
        }

        // Recurse
        for (const key in obj) {
            if (typeof obj[key] === "object") {
                if (Array.isArray(obj[key])) {
                    obj[key].forEach(inject)
                } else {
                    inject(obj[key])
                }
            }
        }
    }

    inject(cloned)
    return cloned
}
