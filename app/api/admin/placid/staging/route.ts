import { supabase } from "@/lib/supabase";

// GET: List all pending templates from staging
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("placid_template_staging")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return Response.json({ templates: data || [] });
    } catch (error: any) {
        return Response.json(
            { error: error.message || "Failed to fetch staging templates" },
            { status: 500 }
        );
    }
}

// PATCH: Update staging template metadata
export async function PATCH(req: Request) {
    try {
        const { id, price, category, tags, thumbnail_url } = await req.json();

        if (!id) {
            return Response.json({ error: "id is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("placid_template_staging")
            .update({
                price,
                category,
                tags,
                thumbnail_url,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        if (error) throw error;

        return Response.json({ success: true });
    } catch (error: any) {
        return Response.json(
            { error: error.message || "Failed to update staging template" },
            { status: 500 }
        );
    }
}

// POST: Commit staging templates to poster_templates
export async function POST(req: Request) {
    try {
        const { staging_ids } = await req.json();

        if (!staging_ids || !Array.isArray(staging_ids) || staging_ids.length === 0) {
            return Response.json(
                { error: "staging_ids array is required" },
                { status: 400 }
            );
        }

        // Fetch staging templates
        const { data: stagingTemplates, error: fetchError } = await supabase
            .from("placid_template_staging")
            .select("*")
            .in("id", staging_ids);

        if (fetchError) throw fetchError;

        if (!stagingTemplates || stagingTemplates.length === 0) {
            return Response.json(
                { error: "No staging templates found" },
                { status: 404 }
            );
        }

        const committed = [];
        const failed = [];

        for (const staging of stagingTemplates) {
            // Validate required fields
            if (!staging.price || !staging.category) {
                failed.push({
                    id: staging.id,
                    reason: "Missing required fields: price or category",
                });
                continue;
            }

            // Convert layers to fields_required
            const fields_required = (staging.placid_layers || [])
                .filter((l: any) => l.dynamic)
                .map((l: any) => ({
                    name: l.name,
                    label: l.name.replace(/_/g, " "),
                    type: l.type === "picture" ? "image" : "text",
                    required: true,
                }));

            // Generate template_id (Placid prefix)
            const { data: lastTemplate } = await supabase
                .from("poster_templates")
                .select("template_id")
                .like("template_id", "Temp%")
                .order("template_id", { ascending: false })
                .limit(1);

            let nextNumber = 1;
            if (lastTemplate && lastTemplate.length > 0) {
                const match = lastTemplate[0].template_id.match(/\d+$/);
                if (match) {
                    nextNumber = parseInt(match[0], 10) + 1;
                }
            }
            const template_id = `Temp${nextNumber.toString().padStart(3, "0")}`;

            // Insert into poster_templates
            const { error: insertError } = await supabase
                .from("poster_templates")
                .insert({
                    template_id,
                    template_uuid: staging.placid_template_uuid,
                    template_name: staging.placid_name,
                    engine_type: "placid",
                    price: staging.price,
                    category: staging.category,
                    tag: staging.tags?.[0] || null,
                    thumbnail_path: staging.thumbnail_url,
                    fields_required,
                    is_active: false, // Admin activates manually
                });

            if (insertError) {
                failed.push({ id: staging.id, reason: insertError.message });
                continue;
            }

            // Mark as committed in staging
            const { error: updateError } = await supabase
                .from("placid_template_staging")
                .update({ status: "committed" })
                .eq("id", staging.id);

            if (updateError) {
                failed.push({ id: staging.id, reason: updateError.message });
            } else {
                committed.push(staging.id);
            }
        }

        return Response.json({
            success: true,
            committed: committed.length,
            failed: failed.length,
            details: { committed, failed },
        });
    } catch (error: any) {
        return Response.json(
            { error: error.message || "Failed to commit templates" },
            { status: 500 }
        );
    }
}
