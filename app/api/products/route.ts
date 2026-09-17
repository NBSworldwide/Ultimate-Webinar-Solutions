import { NextResponse } from "next/server";
import { getProducts } from "@/lib/commerce";

export async function GET() {
  return NextResponse.json({ products: await getProducts(true) });
}
