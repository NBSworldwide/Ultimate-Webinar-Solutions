import { NextResponse } from "next/server";
import { z } from "zod";
import { submitTestimonial } from "@/lib/testimonials";
import { DomainError } from "@/lib/errors";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

const schema = z.object({ customerName: z.string().trim().min(2).max(120), customerEmail: z.string().trim().email().max(200), quote: z.string().trim().min(20).max(1000), rating: z.number().int().min(1).max(5), productId: z.string().nullable().optional() });
export async function POST(request: Request) { try { assertSameOrigin(request); await submitTestimonial(schema.parse(await request.json())); return NextResponse.json({ submitted: true }, { status: 201 }); } catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: "Complete the testimonial fields." }, { status: 400 }); if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode }); if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 }); return NextResponse.json({ error: "The testimonial could not be submitted." }, { status: 500 }); } }
