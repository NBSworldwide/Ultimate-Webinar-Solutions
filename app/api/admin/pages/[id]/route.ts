import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { deletePage, getPageById, updatePage } from "@/lib/pages";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const pageSchema = z.object({
  slug: z.string().trim().max(120).default(""),
  title: z.string().trim().min(2).max(140),
  excerpt: z.string().trim().max(500).default(""),
  status: z.enum(["draft", "published", "archived"]),
  isHomepage: z.boolean().default(false),
  blocks: z.unknown(),
  seoTitle: z.string().trim().max(160).default(""),
  seoDescription: z.string().trim().max(300).default(""),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "content.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const page = await updatePage((await params).id, pageSchema.parse(await request.json()), user.id);
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/locations");
    revalidatePath("/pages");
    revalidatePath(`/pages/${page.slug}`);
    revalidatePath("/admin/pages");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ page: { id: page.id, slug: page.slug } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the required page fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The page could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "content.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const id = (await params).id;
    const page = await getPageById(id);
    if (!page) return NextResponse.json({ error: "Page not found." }, { status: 404 });
    await deletePage(id, user.id);
    revalidatePath("/pages");
    revalidatePath(`/pages/${page.slug}`);
    revalidatePath("/admin/pages");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The page could not be deleted." }, { status: 500 });
  }
}
