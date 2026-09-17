import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError } from "@/lib/errors";
import { getNavigationCandidates, getNavigationMenus, createNavigationMenu } from "@/lib/navigation";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const locationSchema = z.enum(["header", "footer", "mobile"]);
const createMenuSchema = z.object({
  name: z.string().trim().min(2).max(100),
  locations: z.array(locationSchema).min(1).max(3),
  autoAddPublishedPages: z.boolean(),
});

function deny(user: Awaited<ReturnType<typeof getCurrentUser>>): NextResponse {
  return NextResponse.json(
    { error: user ? "You do not have permission for navigation management." : "Sign in to continue." },
    { status: user ? 403 : 401 },
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return deny(user);
  try {
    const [menus, candidates] = await Promise.all([getNavigationMenus(), getNavigationCandidates()]);
    return NextResponse.json({ menus, candidates });
  } catch {
    return NextResponse.json({ error: "Navigation settings could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return deny(user);
  try {
    assertSameOrigin(request);
    const menu = await createNavigationMenu(createMenuSchema.parse(await request.json()), user.id);
    revalidatePath("/");
    revalidatePath("/admin/navigation");
    return NextResponse.json({ menu }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a menu name and choose at least one location." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The navigation menu could not be created." }, { status: 500 });
  }
}
