import { NextResponse } from "next/server";
import { getPublicWebinars } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ webinars: await getPublicWebinars() });
}
