import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { addCrmNote, DomainError } from "@/lib/crm";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const noteSchema = z.object({ body: z.string().trim().min(2).max(4000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access is required." }, { status: 401 });
  try {
    assertSameOrigin(request);
    const note = await addCrmNote((await params).id, noteSchema.parse(await request.json()).body, user.id);
    revalidatePath("/admin/crm");
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a note." }, { status: 400 });
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The note could not be saved." }, { status: 500 });
  }
}
