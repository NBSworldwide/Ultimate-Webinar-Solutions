import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock3, Mail, ShieldCheck, Workflow } from "lucide-react";
import { EmailSequenceForm } from "@/components/email-sequence-form";
import { EmailSequenceEditForm } from "@/components/email-sequence-edit-form";
import { EmailTemplateEditForm } from "@/components/email-template-edit-form";
import { EmailTemplateForm } from "@/components/email-template-form";
import { getEmailOutbox, getEmailSequences, getEmailTemplateRevisions, getEmailTemplates } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { getCurrentUser, hasCapability } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email correspondence" };

export default async function EmailAdminPage() {
  const user = await getCurrentUser();
  if (!hasCapability(user, "email.manage")) redirect("/admin");
  const [templates, sequences, outbox] = await Promise.all([
    getEmailTemplates(),
    getEmailSequences(),
    getEmailOutbox(),
  ]);
  const revisions = await Promise.all(
    templates.map(async (template) => [template.id, await getEmailTemplateRevisions(template.id)] as const),
  );
  const revisionsByTemplate = new Map(revisions);

  return (
    <div className="content-width">
      <div className="page-topline">
        <div>
          <span className="eyebrow">Content management</span>
          <h1 className="page-title">Email correspondence.</h1>
          <p className="page-subtitle">Create reusable messages and timed journeys for registrations, sessions, products, and fulfillment.</p>
        </div>
        <span className="status-badge status-active"><span className="status-dot" />Provider-neutral</span>
      </div>
      <div className="notice-banner">
        <ShieldCheck size={17} />
        <span><strong>Sending boundary.</strong> Templates and delivery jobs are ready locally. No external email provider is contacted until a server-side adapter is configured.</span>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title">Templates <span className="muted">({templates.length})</span></h2><Mail size={17} color="#0f776e" /></div>
          {templates.length > 0 ? <div className="email-template-list">{templates.map((template) => (
            <article className="email-template-row" key={template.id}>
              <div><strong>{template.name}</strong><small>{template.triggerKey} · {template.messageType} · v{template.version}</small><p>{template.subject}</p></div>
              <span className={`status-badge status-${template.status}`}><span className="status-dot" />{template.status}</span>
              <EmailTemplateEditForm template={template} revisions={revisionsByTemplate.get(template.id) ?? []} />
            </article>
          ))}</div> : <div className="empty-state"><p>No templates yet.</p></div>}
        </section>
        <section className="panel">
          <div className="panel-header"><h2 className="panel-title">Sequences <span className="muted">({sequences.length})</span></h2><Workflow size={17} color="#0f776e" /></div>
          {sequences.length > 0 ? <div className="email-template-list">{sequences.map((sequence) => (
            <article className="email-template-row" key={sequence.id}>
              <div><strong>{sequence.name}</strong><small>{sequence.triggerKey} · {sequence.steps.length} step{sequence.steps.length === 1 ? "" : "s"}</small><p>{sequence.steps.map((step) => `${step.templateName} (${step.delayMinutes}m)`).join(" → ") || "No steps configured"}</p></div>
              <span className={`status-badge status-${sequence.status === "active" ? "active" : "queued"}`}><span className="status-dot" />{sequence.status}</span>
              <EmailSequenceEditForm sequence={sequence} />
            </article>
          ))}</div> : <div className="empty-state"><p>No sequences yet.</p></div>}
        </section>
      </div>
      <div className="dashboard-grid section-spacer"><EmailTemplateForm /><EmailSequenceForm templates={templates} /></div>
      <section className="panel section-spacer">
        <div className="panel-header"><div><h2 className="panel-title">Delivery outbox <span className="muted">({outbox.length})</span></h2><span className="row-meta">Durable jobs ready for a worker or provider adapter</span></div><Clock3 size={17} color="#8b9995" /></div>
        {outbox.length > 0 ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Recipient</th><th>Template</th><th>Trigger</th><th>Status</th><th>Scheduled</th></tr></thead><tbody>{outbox.map((item) => (
          <tr key={item.id}><td><strong>{item.recipientName || "Unnamed recipient"}</strong><span className="muted" style={{ display: "block" }}>{item.recipientEmail}</span></td><td>{item.templateName ?? "Template removed"}</td><td className="muted">{item.triggerKey}</td><td><span className={`status-badge status-${item.status === "queued" ? "queued" : item.status === "sent" ? "active" : "draft"}`}><span className="status-dot" />{item.status}</span></td><td className="muted">{formatDateTime(item.scheduledAt)}</td></tr>
        ))}</tbody></table></div> : <div className="empty-state"><p>No correspondence is queued yet.</p></div>}
      </section>
    </div>
  );
}
