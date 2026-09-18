import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError } from "@/lib/errors";
import { getAppearance, updateAppearance } from "@/lib/appearance";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const appearanceSchema = z.object({
  settings: z.object({
    contentWidth: z.number().int().min(480).max(2400),
    containerPadding: z.number().int().min(0).max(160),
    columnGap: z.number().int().min(0).max(300),
    rowGap: z.number().int().min(0).max(300),
    pageTitleSelector: z.string().max(20),
    stretchSections: z.boolean(),
    defaultPageLayout: z.enum(["full_width", "boxed"]),
    breakpoints: z.record(z.string(), z.number().int().min(320).max(2400)),
    customCss: z.string().max(50_000),
  }),
  colors: z.array(z.object({
    id: z.string().max(100).optional(),
    tokenKey: z.string().max(80),
    name: z.string().max(120),
    value: z.string().max(20),
    isSystem: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })).max(80),
  typography: z.array(z.object({
    id: z.string().max(100).optional(),
    tokenKey: z.string().max(80),
    name: z.string().max(120),
    fontFamily: z.string().max(120),
    fontWeight: z.number().int().min(100).max(900),
    fontSize: z.number().min(6).max(160),
    lineHeight: z.number().min(0.5).max(4),
    letterSpacing: z.number().min(-20).max(40),
    textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]),
    fontStyle: z.enum(["normal", "italic", "oblique"]),
    responsive: z.record(z.string(), z.object({
      fontSize: z.number().min(6).max(160).optional(),
      lineHeight: z.number().min(0.5).max(4).optional(),
      letterSpacing: z.number().min(-20).max(40).optional(),
    })).default({}),
    isSystem: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })).max(80),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    return NextResponse.json({ appearance: await getAppearance() });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "The appearance settings could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const body = appearanceSchema.parse(await request.json());
    const appearance = await updateAppearance(body, user.id);
    revalidatePath("/", "layout");
    revalidatePath("/admin/appearance");
    return NextResponse.json({ appearance });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the appearance values and try again." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The appearance settings could not be saved." }, { status: 500 });
  }
}
