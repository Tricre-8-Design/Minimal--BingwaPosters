import { placidFetch } from "@/lib/placid";
import { supabase } from "@/lib/supabase";

// Import templates - single or bulk to staging
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { template_uuid, import_all, selected_uuids } = body;

        // BULK IMPORT TO STAGING
        if (import_all) {
            console.log("Starting bulk import to staging...");

            // Fetch all templates from Placid
            const data = await placidFetch("/templates");
            const allTemplates = data.data || data.templates || data || [];

            // Filter by selected UUIDs if provided
            const templatesToImport = selected_uuids && Array.isArray(selected_uuids)
                ? allTemplates.filter((t: any) => selected_uuids.includes(t.uuid))
                : allTemplates;

            console.log(`Fetched ${allTemplates.length} templates from Placid, importing ${templatesToImport.length} selected`);


            const imported = [];
            const skipped = [];

            for (const template of templatesToImport) {
                const uuid = template.uuid;
                const name = template.title || template.name;

                // Check if already in poster_templates
                const { data: existingTemplate } = await supabase
                    .from("poster_templates")
                    .select("template_uuid")
                    .eq("template_uuid", uuid)
                    .maybeSingle();

                if (existingTemplate) {
                    skipped.push({ template_uuid: uuid, reason: "Already in poster_templates" });
                    continue;
                }

                // Check if already in staging
                const { data: existingStaging } = await supabase
                    .from("placid_template_staging")
                    .select("placid_template_uuid")
                    .eq("placid_template_uuid", uuid)
                    .maybeSingle();

                if (existingStaging) {
                    skipped.push({ template_uuid: uuid, reason: "Already in staging" });
                    continue;
                }

                // Insert into staging
                const { error } = await supabase
                    .from("placid_template_staging")
                    .insert({
                        placid_template_uuid: uuid,
                        placid_name: name,
                        placid_layers: template.layers || [],
                        status: "pending",
                    });

                if (error) {
                    console.error("Insert error:", error);
                    skipped.push({ template_uuid: uuid, reason: error.message });
                } else {
                    console.log(`Imported: ${name}`);
                    imported.push(uuid);
                }
            }

            console.log(`Bulk import complete: ${imported.length} imported, ${skipped.length} skipped`);

            return Response.json({
                success: true,
                imported: imported.length,
                skipped: skipped.length,
                details: { imported, skipped },
            });
        }

        // SINGLE TEMPLATE IMPORT (old logic)
        console.log("Import request for template:", template_uuid);

        if (!template_uuid) {
            return Response.json(
                { error: "template_uuid is required" },
                { status: 400 }
            );
        }

        // Check if already exists in poster_templates
        const { data: existingTemplate, error: checkError1 } = await supabase
            .from("poster_templates")
            .select("template_uuid")
            .eq("template_uuid", template_uuid)
            .maybeSingle();

        if (checkError1) {
            console.error("Error checking poster_templates:", checkError1);
            throw checkError1;
        }

        if (existingTemplate) {
            console.log("Template already in poster_templates");
            return Response.json(
                { error: "Template already exists in poster_templates", skipped: true },
                { status: 409 }
            );
        }

        // Check if already exists in staging
        const { data: existingStaging, error: checkError2 } = await supabase
            .from("placid_template_staging")
            .select("placid_template_uuid")
            .eq("placid_template_uuid", template_uuid)
            .maybeSingle();

        if (checkError2) {
            console.error("Error checking staging:", checkError2);
            throw checkError2;
        }

        if (existingStaging) {
            console.log("Template already in staging");
            return Response.json(
                { error: "Template already exists in staging", skipped: true },
                { status: 409 }
            );
        }

        // Fetch template details from Placid
        console.log("Fetching template from Placid...");
        const template = await placidFetch(`/templates/${template_uuid}`);
        const template_name = template.title || template.name;
        console.log("Template fetched:", template_name);

        // Insert into staging
        const { error } = await supabase
            .from("placid_template_staging")
            .insert({
                placid_template_uuid: template_uuid,
                placid_name: template_name,
                placid_layers: template.layers || [],
                status: "pending",
            });

        if (error) {
            console.error("Insert error:", error);
            throw error;
        }

        console.log("Template imported successfully");
        return Response.json({
            success: true,
            message: "Template imported to staging successfully",
            template_uuid
        });
    } catch (error: any) {
        console.error("Import failed:", error);
        return Response.json(
            { error: error.message || "Failed to import template" },
            { status: 500 }
        );
    }
}

