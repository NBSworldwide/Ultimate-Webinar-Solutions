import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError } from "@/lib/errors";
import { getMediaAsset, trashMediaAsset, updateMediaAsset } from "@/lib/media";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const mediaSchema = z.object({ altText: z.string().max(300), caption: z.string().max(500) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "media.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const asset = await updateMediaAsset((await params).id, mediaSchema.parse(await request.json()), user.id);
    revalidatePath("/admin/media");
    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Check the media description fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The media asset could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "media.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  try {
    assertSameOrigin(request);
    const id = (await params).id;
    if (!(await getMediaAsset(id))) return NextResponse.json({ error: "Media asset not found." }, { status: 404 });
    await trashMediaAsset(id, user.id);
    revalidatePath("/admin/media");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The media asset could not be moved to the trash." }, { status: 500 });
  }
}
