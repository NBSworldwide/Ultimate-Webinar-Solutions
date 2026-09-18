import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { DomainError } from "@/lib/errors";
import { archiveSiteTemplate, getSiteTemplateById, isSiteTemplateSchemaUnavailable, updateSiteTemplate } from "@/lib/templates";
import { revalidateTemplates } from "@/app/api/admin/templates/route";

const templateSchema = z.object({
  kind: z.enum(["header", "footer"]),
  name: z.string().trim().min(2).max(120),
  status: z.enum(["draft", "published", "archived"]),
  isActive: z.boolean().default(false),
  blocks: z.unknown(),
});

async function authorized() {
  const user = await getCurrentUser();
  return user && hasCapability(user, "appearance.manage") ? user : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authorized();
  if (!user) return NextResponse.json({ error: "Sign in with appearance-management access to continue." }, { status: 401 });
  try {
    const template = await getSiteTemplateById((await params).id);
    return template ? NextResponse.json({ template }) : NextResponse.json({ error: "Template not found." }, { status: 404 });
  } catch (error) {
    if (isSiteTemplateSchemaUnavailable(error)) return NextResponse.json({ error: "Apply migration 039_site_templates.sql before managing Header & Footer templates." }, { status: 503 });
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authorized();
  if (!user) return NextResponse.json({ error: "Sign in with appearance-management access to continue." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const template = await updateSiteTemplate((await params).id, templateSchema.parse(await request.json()), user.id);
    revalidateTemplates();
    return NextResponse.json({ template: { id: template.id, kind: template.kind, isActive: template.isActive } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the template fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (isSiteTemplateSchemaUnavailable(error)) return NextResponse.json({ error: "Apply migration 039_site_templates.sql before managing Header & Footer templates." }, { status: 503 });
    return NextResponse.json({ error: "The template could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await authorized();
  if (!user) return NextResponse.json({ error: "Sign in with appearance-management access to continue." }, { status: 401 });
  try {
    assertSameOrigin(request);
    await archiveSiteTemplate((await params).id, user.id);
    revalidateTemplates();
    return NextResponse.json({ archived: true });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (isSiteTemplateSchemaUnavailable(error)) return NextResponse.json({ error: "Apply migration 039_site_templates.sql before managing Header & Footer templates." }, { status: 503 });
    return NextResponse.json({ error: "The template could not be archived." }, { status: 500 });
  }
}
