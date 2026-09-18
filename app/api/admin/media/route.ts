import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasCapability } from "@/lib/authorization";
import { DomainError } from "@/lib/errors";
import { createMediaAsset, getMediaAssets, uploadableImageTypes } from "@/lib/media";
import { assertSameOrigin, RequestSecurityError } from "@/lib/request-security";

export const runtime = "nodejs";

const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "media.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  const url = new URL(request.url);
  return NextResponse.json({ assets: await getMediaAssets({ query: url.searchParams.get("q") ?? "", includeTrashed: url.searchParams.get("includeTrashed") === "1" }) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "media.manage")) return NextResponse.json({ error: user ? "You do not have permission for this area." : "Sign in to continue." }, { status: user ? 403 : 401 });
  let storedPath = "";
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    const fileValue = formData.get("file");
    if (!(fileValue instanceof File)) return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
    if (!uploadableImageTypes.includes(fileValue.type as typeof uploadableImageTypes[number])) return NextResponse.json({ error: "Use a JPEG, PNG, WebP, or GIF image." }, { status: 400 });
    if (fileValue.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Media files must be 10 MB or smaller." }, { status: 400 });
    const id = randomUUID();
    const extension = extensionByType[fileValue.type] ?? "bin";
    const storageKey = `${id}.${extension}`;
    const mediaDirectory = path.join(process.cwd(), "public", "media");
    storedPath = path.join(mediaDirectory, storageKey);
    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(storedPath, new Uint8Array(await fileValue.arrayBuffer()), { flag: "wx" });
    const originalName = fileValue.name.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 160) || `upload.${extension}`;
    const asset = await createMediaAsset({ fileName: originalName, storageKey, url: `/media/${storageKey}`, mimeType: fileValue.type, fileSize: fileValue.size, altText: String(formData.get("altText") ?? ""), caption: String(formData.get("caption") ?? "") }, user.id);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    if (storedPath) await unlink(storedPath).catch(() => undefined);
    if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    if (error instanceof RequestSecurityError) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: "The image could not be uploaded." }, { status: 500 });
  }
}
