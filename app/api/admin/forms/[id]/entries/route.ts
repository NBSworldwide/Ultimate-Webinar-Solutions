import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { getFormEntries } from "@/lib/forms";
import type { FormEntryFilter } from "@/lib/types";

const filters: FormEntryFilter[] = ["all", "unread", "starred", "spam", "trash", "payments"];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "forms.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  const url = new URL(request.url);
  const rawFilter = url.searchParams.get("filter") ?? "all";
  const filter = filters.includes(rawFilter as FormEntryFilter) ? rawFilter as FormEntryFilter : "all";
  const result = await getFormEntries((await params).id, { filter, query: url.searchParams.get("q") ?? "", fieldId: url.searchParams.get("fieldId") ?? "", operator: ["equals", "not_equals", "contains"].includes(url.searchParams.get("operator") ?? "") ? url.searchParams.get("operator") as "equals" | "not_equals" | "contains" : "contains", dateFrom: url.searchParams.get("dateFrom") ?? "", dateTo: url.searchParams.get("dateTo") ?? "", page: Number(url.searchParams.get("page") ?? 1), pageSize: Number(url.searchParams.get("pageSize") ?? 25), sort: ["created_at", "entry_number", "updated_at"].includes(url.searchParams.get("sort") ?? "") ? url.searchParams.get("sort") as "created_at" | "entry_number" | "updated_at" : "created_at", direction: url.searchParams.get("direction") === "asc" ? "asc" : "desc" });
  return NextResponse.json({ entries: result });
}
