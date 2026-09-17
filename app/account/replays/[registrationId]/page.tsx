import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, CalendarDays, LockKeyhole, PlayCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerReplayAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Replay access", robots: { index: false, follow: false } };

type ReplayPageProps = { params: Promise<{ registrationId: string }> };

export default async function ReplayPage({ params }: ReplayPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { registrationId } = await params;
  const access = await getCustomerReplayAccess(user.id, registrationId);
  if (!access) notFound();

  return <div className="public-shell"><PublicHeader /><main className="public-main" id="main-content"><div className="breadcrumb"><Link href="/account"><ArrowLeft size={13} /> Back to account</Link><span>/</span><span>Replay access</span></div><div className="page-topline"><div><span className="eyebrow">Attendee portal</span><h1 className="page-title">{access.webinarTitle}</h1><p className="page-subtitle">{access.replayLabel}</p></div></div><section className="replay-panel"><div className="replay-panel-icon"><PlayCircle size={30} /></div><div><span className="eyebrow">Access verified</span><h2>Your replay is ready.</h2><p>Registration access is checked on the server for this account before the hosted replay link is shown.</p><p className="row-meta"><CalendarDays size={13} /> Live session: {formatDateTime(access.startsAt, access.timezone)}</p>{access.accessStatus === "active" && access.paymentStatus === "paid" && access.replayUrl ? <a className="button" href={access.replayUrl} target="_blank" rel="noreferrer"><PlayCircle size={16} /> Launch hosted replay <ArrowUpRight size={14} /></a> : <div className="notice-banner"><LockKeyhole size={16} /><span>{access.accessStatus === "removed" ? "Replay access has been removed for this registration." : "The replay provider has not published this recording yet."}</span></div>}</div></section><div className="notice-banner" style={{ marginTop: 18 }}><LockKeyhole size={16} /><span>This sample uses a placeholder provider URL. Production should replace it with a short-lived, signed playback URL from the configured video provider.</span></div></main><PublicFooter /></div>;
}
