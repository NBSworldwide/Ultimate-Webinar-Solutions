import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, UsersRound } from "lucide-react";
import { TeamAdministratorOfRecordForm } from "@/components/team-administrator-form";
import { TeamMemberForm } from "@/components/team-member-form";
import { TeamPromotionRequests } from "@/components/team-promotion-requests";
import { TeamRoleForm } from "@/components/team-role-form";
import { TeamPasswordResetButton } from "@/components/team-password-reset-button";
import { getCurrentUser, hasCapability, roleLabel } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getAdministratorOfRecord, getTeamRoleChangeRequests, getTeamUsers } from "@/lib/team";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team & access", robots: { index: false, follow: false } };

export default async function TeamPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasCapability(currentUser, "team.view")) redirect("/admin");

  const [users, administratorOfRecord, pendingRequests] = await Promise.all([
    getTeamUsers(),
    getAdministratorOfRecord(),
    getTeamRoleChangeRequests("pending"),
  ]);
  const administrators = users.filter((user) => user.role === "admin");
  const canManage = hasCapability(currentUser, "team.manage");
  const canApprove = hasCapability(currentUser, "team.approve");
  const pendingTargetIds = new Set(pendingRequests.map((request) => request.targetUserId));

  return <div className="content-width">
    <div className="page-topline"><div><span className="eyebrow">Workspace control</span><h1 className="page-title">Team & access.</h1><p className="page-subtitle">Keep Administrator, Manager, and Customer access separate with a clear approval boundary.</p></div><span className="status-badge status-active"><span className="status-dot" />{users.length} accounts</span></div>
    <div className="notice-banner"><ShieldCheck size={17} /><span><strong>{canApprove ? "Administrator approval is enabled." : "Team access is visible to Managers."}</strong> Managers and Administrators can request a Customer promotion, but the role changes only after the Administrator of Record approves it. Customers stay on public-facing account and shopping flows.</span></div>
    {canManage ? <div className="dashboard-grid"><TeamMemberForm /><TeamAdministratorOfRecordForm administrators={administrators} selectedId={administratorOfRecord.id} /></div> : null}
    {canApprove ? <TeamPromotionRequests requests={pendingRequests} /> : <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Promotion workflow</h2><span className="row-meta">Requests route to {administratorOfRecord.name}, the current Administrator of Record.</span></div></div><p className="field-help">Use the role control beside a Customer account to submit a manager-promotion request. You will receive the decision notification with the rest of the involved parties.</p></section>}
    <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Accounts <span className="muted">({users.length})</span></h2><span className="row-meta">Role changes, password resets, and approval decisions are audited</span></div><UsersRound size={17} color="#0f776e" /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Account</th><th>Role</th><th>Created</th><th>Change access</th><th>Security</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><span className="muted" style={{ display: "block" }}>@{user.username} · {user.email}</span></td><td><span className={`status-badge status-${user.role === "admin" ? "active" : user.role === "manager" ? "queued" : "free"}`}><span className="status-dot" />{roleLabel(user.role)}</span></td><td className="muted">{formatDateTime(user.createdAt)}</td><td><TeamRoleForm userId={user.id} role={user.role} disabled={user.id === currentUser.id} canManageRoles={canManage} canRequestPromotion={hasCapability(currentUser, "team.promote")} promotionPending={pendingTargetIds.has(user.id)} /></td><td>{canManage && user.id !== currentUser.id ? <TeamPasswordResetButton userId={user.id} /> : <span className="muted">Use account security</span>}</td></tr>)}</tbody></table></div></section>
  </div>;
}
