import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MediaManager } from "@/components/media-manager";
import { getCurrentUser, hasCapability } from "@/lib/auth";
import { getMediaAssets } from "@/lib/media";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Media Library", robots: { index: false, follow: false } };

export default async function MediaPage() {
  const user = await getCurrentUser();
  if (!user || !hasCapability(user, "media.manage")) redirect("/admin");
  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Content assets</span><h1 className="page-title">Media Library.</h1><p className="page-subtitle">Upload local image assets once, then reuse their safe URLs across pages, forms, and site identity.</p></div></div><div className="notice-banner"><strong>Local storage boundary.</strong><span>Images are stored in the local public media directory and recorded in the standalone database. No external media provider is contacted.</span></div><MediaManager initialAssets={await getMediaAssets()} /></div>;
}
