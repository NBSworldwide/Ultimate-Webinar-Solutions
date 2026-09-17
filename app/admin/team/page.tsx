import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, UsersRound } from "lucide-react";
import { TeamMemberForm } from "@/components/team-member-form";
import { TeamRoleForm } from "@/components/team-role-form";
import { getCurrentUser, hasCapability, roleLabel } from "@/lib/auth";
import { getTeamUsers } from "@/lib/team";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team & access", robots: { index: false, follow: false } };

export default async function TeamPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasCapability(currentUser, "team.manage")) redirect("/admin");
  const users = await getTeamUsers();

  return <div className="content-width"><div className="page-topline"><div><span className="eyebrow">Workspace control</span><h1 className="page-title">Team & access.</h1><p className="page-subtitle">Keep administrator, manager, and customer access separate with a clear permission boundary.</p></div><span className="status-badge status-active"><span className="status-dot" />{users.length} accounts</span></div><div className="notice-banner"><ShieldCheck size={17} /><span><strong>Administrator-only control.</strong> Only administrators can create staff accounts or change roles. Customers stay on public-facing account and shopping flows.</span></div><div className="dashboard-grid"><TeamMemberForm /><section className="panel"><div className="panel-header"><div><h2 className="panel-title">Accounts <span className="muted">({users.length})</span></h2><span className="row-meta">Role changes are audited</span></div><UsersRound size={17} color="#0f776e" /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Account</th><th>Role</th><th>Created</th><th>Change access</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><span className="muted" style={{ display: "block" }}>{user.email}</span></td><td><span className={`status-badge status-${user.role === "admin" ? "active" : user.role === "manager" ? "queued" : "free"}`}><span className="status-dot" />{roleLabel(user.role)}</span></td><td className="muted">{formatDateTime(user.createdAt)}</td><td><TeamRoleForm userId={user.id} role={user.role} disabled={user.id === currentUser.id} /></td></tr>)}</tbody></table></div></section></div></div>;
}
