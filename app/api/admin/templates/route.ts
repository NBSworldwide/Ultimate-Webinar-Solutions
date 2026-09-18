import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { DomainError } from "@/lib/errors";
import { createSiteTemplate, getSiteTemplates, isSiteTemplateSchemaUnavailable, templateStarterBlocks } from "@/lib/templates";

const templateSchema = z.object({
  kind: z.enum(["header", "footer"]),
  name: z.string().trim().min(2).max(120),
  status: z.enum(["draft", "published", "archived"]),
  isActive: z.boolean().default(false),
  blocks: z.unknown().optional(),
});

function revalidateTemplates(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin/appearance");
  revalidatePath("/admin/appearance/templates");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    return NextResponse.json({ templates: await getSiteTemplates() });
  } catch (error) {
    if (isSiteTemplateSchemaUnavailable(error)) return NextResponse.json({ error: "Apply migration 039_site_templates.sql before managing Header & Footer templates." }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const body = templateSchema.parse(await request.json());
    const template = await createSiteTemplate({ ...body, blocks: body.blocks ?? templateStarterBlocks(body.kind) }, user.id);
    revalidateTemplates();
    return NextResponse.json({ template: { id: template.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the template fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (isSiteTemplateSchemaUnavailable(error)) return NextResponse.json({ error: "Apply migration 039_site_templates.sql before managing Header & Footer templates." }, { status: 503 });
    return NextResponse.json({ error: "The template could not be created." }, { status: 500 });
  }
}

export { revalidateTemplates };
