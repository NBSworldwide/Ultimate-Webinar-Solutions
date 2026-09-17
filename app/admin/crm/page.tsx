import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContactRound, Search, ShieldCheck, Tags } from "lucide-react";
import { CrmContactEditForm } from "@/components/crm-contact-edit-form";
import { CrmContactForm } from "@/components/crm-contact-form";
import { CrmNoteForm } from "@/components/crm-note-form";
import { CrmTagForm } from "@/components/crm-tag-form";
import { getCrmContacts, getCrmTags } from "@/lib/crm";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CRM" };

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!hasCapability(user, "crm.manage")) redirect("/admin");
  const query = ((await searchParams).q ?? "").trim();
  const [contacts, tags] = await Promise.all([getCrmContacts(query), getCrmTags()]);

  return (
    <div className="content-width">
      <div className="page-topline">
        <div>
          <span className="eyebrow">People management</span>
          <h1 className="page-title">CRM.</h1>
          <p className="page-subtitle">One contact record for session attendees, product customers, leads, notes, tags, consent, and activity.</p>
        </div>
        <span className="status-badge status-active"><span className="status-dot" />{contacts.length} visible</span>
      </div>
      <div className="notice-banner"><ShieldCheck size={17} /><span><strong>Unified customer view.</strong> Registrations and product orders upsert contacts by normalized email. Original customer data is not imported.</span></div>
      <div className="crm-toolbar">
        <form method="get" className="crm-search"><Search size={16} /><input name="q" defaultValue={query} placeholder="Search name, email, or company" aria-label="Search contacts" /><button className="button button-small" type="submit">Search</button></form>
        <span className="row-meta"><Tags size={14} /> {tags.length} reusable tags</span>
      </div>
      <div className="dashboard-grid">
        <CrmContactForm />
        <section className="panel">
          <div className="panel-header"><div><h2 className="panel-title">Contacts <span className="muted">({contacts.length})</span></h2><span className="row-meta">Searchable master records</span></div><ContactRound size={17} color="#0f776e" /></div>
          {contacts.length > 0 ? <div className="crm-contact-list">{contacts.map((contact) => (
            <article className="crm-contact-card" key={contact.id}>
              <div className="crm-contact-heading">
                <div><span className="eyebrow">{contact.lifecycleStage} · {contact.source}</span><h3>{contact.name}</h3><p>{contact.email}{contact.company ? " · " + contact.company : ""}{contact.phone ? " · " + contact.phone : ""}</p></div>
                <span className={"status-badge status-" + (contact.marketingConsent ? "active" : "queued")}><span className="status-dot" />{contact.marketingConsent ? "Marketing consent" : "Transactional only"}</span>
              </div>
              <CrmContactEditForm contact={contact} />
              <CrmTagForm contact={contact} tags={tags} />
              <div className="crm-activity-grid">
                <div><strong>Recent activity</strong>{contact.activities.length > 0 ? <ul>{contact.activities.slice(0, 4).map((activity) => <li key={activity.id}><span>{activity.subject}</span><small>{formatDateTime(activity.occurredAt)}</small></li>)}</ul> : <p className="muted">No activity recorded.</p>}</div>
                <div><strong>Internal notes</strong>{contact.notes.length > 0 ? <ul>{contact.notes.slice(0, 3).map((note) => <li key={note.id}><span>{note.body}</span><small>{formatDateTime(note.createdAt)}</small></li>)}</ul> : <p className="muted">No notes yet.</p>}<CrmNoteForm contactId={contact.id} /></div>
              </div>
            </article>
          ))}</div> : <div className="empty-state"><div className="empty-icon"><ContactRound size={20} /></div><h3>No contacts found</h3><p>New registrations and product orders will create contact records automatically.</p></div>}
        </section>
      </div>
    </div>
  );
}
