import { placidFetch } from "@/lib/placid";

export async function GET(
    request: Request,
    { params }: { params: { uuid: string } }
) {
    try {
        const { uuid } = params;

        console.log("Fetching template details for:", uuid);

        const template = await placidFetch(`/templates/${uuid}`);

        console.log("Template fetched:", template.title || template.name);

        return Response.json({
            success: true,
            template: template
        });
    } catch (error: any) {
        console.error("Failed to fetch template:", error);
        return Response.json(
            { error: error.message || "Failed to fetch template details" },
            { status: 500 }
        );
    }
}
