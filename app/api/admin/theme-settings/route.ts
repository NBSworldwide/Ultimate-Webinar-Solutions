import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";
import { updateThemeSettings } from "@/lib/theme-settings";

const themeSchema = z.object({
  preset: z.enum(["studio", "honor", "autumn", "green", "custom"]),
  bodyStyle: z.enum(["fullwide", "wide", "boxed"]),
  contentWidth: z.number().int().min(960).max(1440),
  sectionSpacing: z.enum(["none", "small", "medium", "large"]),
  shopLayout: z.enum(["grid", "list"]),
  headingFont: z.enum(["manrope", "dm-sans", "montserrat", "roboto", "karla", "garamond"]),
  bodyFont: z.enum(["manrope", "dm-sans", "montserrat", "roboto", "karla", "garamond"]),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  surfaceColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  surfaceRaisedColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  inkColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  inkSoftColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  inkFaintColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  lineColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  cardRadius: z.number().int().min(0).max(32),
  buttonRadius: z.number().int().min(0).max(32),
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "appearance.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const settings = await updateThemeSettings(themeSchema.parse(await request.json()), user.id);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the theme controls and color values." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The theme settings could not be saved." }, { status: 500 });
  }
}
