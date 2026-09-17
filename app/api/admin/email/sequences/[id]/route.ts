import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DomainError, updateEmailSequence } from "@/lib/email";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const sequenceSchema = z.object({
  name: z.string().trim().min(2).max(140),
  triggerKey: z.string().trim().min(2).max(100),
  status: z.enum(["draft", "active", "paused", "archived"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    await updateEmailSequence((await params).id, sequenceSchema.parse(await request.json()), user.id);
    revalidatePath("/admin/email");
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the sequence fields." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The email sequence could not be updated." }, { status: 500 });
  }
}
