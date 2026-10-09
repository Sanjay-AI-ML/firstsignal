import { getStarterTemplate } from "@/lib/starter-templates";

export async function GET(_request: Request, { params }: { params: Promise<{ template: string }> }) {
  const { template: id } = await params;
  const template = getStarterTemplate(id);
  if (!template) return new Response("Template not found.", { status: 404 });
  return new Response(template.markdown, { headers: {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Disposition": `attachment; filename="firstsignal-${template.id}.md"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=3600",
  } });
}
