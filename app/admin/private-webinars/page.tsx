import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { PrivateInviteForm } from "@/components/private-invite-form";
import { getPrivateWebinarInvites, getWebinars } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private webinars", robots: { index: false, follow: false } };

export default async function PrivateWebinarsPage() {
  const privateWebinars = (await getWebinars(false)).filter((webinar) => webinar.visibility === "private");
  const webinarsWithInvites = await Promise.all(
    privateWebinars.map(async (webinar) => ({ webinar, invites: await getPrivateWebinarInvites(webinar.id) })),
  );

  return (
    <div className="content-width">
      <div className="page-topline">
        <div>
          <span className="eyebrow">Attendee access</span>
          <h1 className="page-title">Private webinars.</h1>
          <p className="page-subtitle">Create invite-only sessions and manage each attendee’s access code without exposing the session in the public catalog.</p>
        </div>
        <Link href="/admin/webinars/new" className="button">Create a webinar <ArrowUpRight size={14} /></Link>
      </div>
      <div className="notice-banner"><ShieldCheck size={17} /><span><strong>Invite boundary.</strong> Codes are generated server-side, stored only as hashes, and shown to the administrator only when they are generated.</span></div>
      {webinarsWithInvites.length > 0 ? (
        <div className="private-webinar-list">
          {webinarsWithInvites.map(({ webinar, invites }) => (
            <section className="panel private-webinar-panel" id={webinar.slug} key={webinar.id}>
              <div className="panel-header">
                <div>
                  <span className="eyebrow"><LockKeyhole size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Invite only · {webinar.status}</span>
                  <h2 className="panel-title">{webinar.title}</h2>
                  <p className="muted private-webinar-meta">{formatDateTime(webinar.startsAt, webinar.timezone)} · {invites.length} invitation{invites.length === 1 ? "" : "s"}</p>
                </div>
                <Link href={`/admin/webinars/${webinar.id}`} className="panel-link">Open session <ArrowUpRight size={13} /></Link>
              </div>
              <PrivateInviteForm webinarId={webinar.id} slug={webinar.slug} initialInvites={invites} />
            </section>
          ))}
        </div>
      ) : (
        <section className="panel empty-state">
          <div className="empty-icon"><LockKeyhole size={20} /></div>
          <h2>No private webinars yet</h2>
          <p>Use the webinar creator to mark a session as private, then return here to generate its attendee invitations.</p>
          <Link href="/admin/webinars/new" className="button" style={{ marginTop: 17 }}>Create private webinar</Link>
        </section>
      )}
    </div>
  );
}
