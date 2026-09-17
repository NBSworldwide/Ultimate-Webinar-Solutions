import { NextResponse } from "next/server";
import { processEndedWebinars } from "@/lib/data";

export const runtime = "nodejs";

async function processRequest(request: Request) {
  const expected = [process.env.WEBINAR_WORKER_SECRET, process.env.CRON_SECRET].filter((value): value is string => Boolean(value));
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-webinar-worker-secret");
  if (expected.length === 0 || !provided || !expected.includes(provided)) return NextResponse.json({ error: "Worker authorization is required." }, { status: 401 });
  try {
    return NextResponse.json(await processEndedWebinars());
  } catch {
    return NextResponse.json({ error: "Webinar lifecycle processing failed." }, { status: 500 });
  }
}

export const GET = processRequest;
export const POST = processRequest;
