import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError } from "@/lib/errors";
import { deleteNavigationMenu, getNavigationMenu, navigationItemTypes, navigationLocations, updateNavigationMenu } from "@/lib/navigation";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const menuItemSchema = z.object({
  id: z.string().trim().max(120).optional(),
  parentId: z.string().trim().max(120).nullable().optional(),
  label: z.string().trim().min(1).max(120),
  href: z.string().trim().min(1).max(500),
  itemType: z.enum(navigationItemTypes),
  entityId: z.string().trim().max(240).nullable().optional(),
  openInNewTab: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});

const menuSchema = z.object({
  name: z.string().trim().min(2).max(100),
  locations: z.array(z.enum(navigationLocations)).min(1).max(3),
  autoAddPublishedPages: z.boolean(),
  items: z.array(menuItemSchema).max(100),
});

function deny(user: Awaited<ReturnType<typeof getCurrentUser>>): NextResponse {
  return NextResponse.json(
    { error: user ? "You do not have permission for navigation management." : "Sign in to continue." },
    { status: user ? 403 : 401 },
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return deny(user);
  try {
    const menu = await getNavigationMenu((await params).id);
    return menu ? NextResponse.json({ menu }) : NextResponse.json({ error: "Navigation menu not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "The navigation menu could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return deny(user);
  try {
    assertSameOrigin(request);
    const menu = await updateNavigationMenu((await params).id, menuSchema.parse(await request.json()), user.id);
    revalidatePath("/");
    revalidatePath("/admin/navigation");
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ menu });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the menu details and each menu item." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The navigation menu could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return deny(user);
  try {
    assertSameOrigin(request);
    await deleteNavigationMenu((await params).id, user.id);
    revalidatePath("/");
    revalidatePath("/admin/navigation");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The navigation menu could not be deleted." }, { status: 500 });
  }
}
