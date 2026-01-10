import { placidFetch } from "@/lib/placid";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        let allTemplates: any[] = [];
        let currentPage = 1;
        let hasMore = true;

        // Fetch all pages from Placid
        console.log("Fetching all templates from Placid...");

        while (hasMore) {
            const data = await placidFetch(`/templates?page=${currentPage}`);

            const templates = data.data || data.templates || [];
            allTemplates = allTemplates.concat(templates);

            console.log(`Page ${currentPage}: Fetched ${templates.length} templates`);

            // Check if there are more pages
            const meta = data.meta;
            if (meta && meta.current_page < meta.last_page) {
                currentPage++;
            } else {
                hasMore = false;
            }
        }

        console.log(`Total fetched from Placid: ${allTemplates.length}`);

        // Fetch existing template UUIDs from poster_templates
        const { data: existingTemplates, error: dbError } = await supabase
            .from("poster_templates")
            .select("template_uuid");

        if (dbError) {
            console.error("Error fetching existing templates:", dbError);
        }

        const existingUUIDs = new Set(
            existingTemplates?.map(t => t.template_uuid).filter(Boolean) || []
        );

        // Filter out templates that already exist in poster_templates
        const newTemplates = allTemplates.filter(
            (template: any) => !existingUUIDs.has(template.uuid)
        );

        console.log(`Total: ${allTemplates.length}, Already imported: ${existingUUIDs.size}, Available: ${newTemplates.length}`);

        return Response.json({
            templates: newTemplates,
            total: newTemplates.length,
            total_in_placid: allTemplates.length,
            already_imported: existingUUIDs.size
        });
    } catch (error: any) {
        console.error("Placid API error:", error);
        return Response.json(
            { error: error.message || "Failed to fetch Placid templates" },
            { status: 500 }
        );
    }
}
