import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb, type DatabaseClient } from "@/lib/db";
import { queueCorrespondence } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import type { Role, TeamRoleChangeRequestStatus, TeamRoleChangeRequestView, User } from "@/lib/types";

export interface TeamUserView extends User {
  createdAt: string;
}

export class TeamAccountError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 409) {
    super(message);
    this.name = "TeamAccountError";
    this.statusCode = statusCode;
  }
}

type TeamUserRow = { id: string; email: string; username: string; name: string; role: Role; created_at: string };
type RoleChangeRequestRow = {
  id: string;
  target_user_id: string;
  target_name: string;
  target_email: string;
  target_username: string;
  requested_role: "manager";
  requested_by: string;
  requester_name: string;
  requester_email: string;
  status: TeamRoleChangeRequestStatus;
  reviewed_by: string | null;
  reviewer_name: string | null;
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
};

function toTeamUser(row: TeamUserRow): TeamUserView {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

function toRoleChangeRequest(row: RoleChangeRequestRow): TeamRoleChangeRequestView {
  return {
    id: row.id,
    targetUserId: row.target_user_id,
    targetName: row.target_name,
    targetEmail: row.target_email,
    targetUsername: row.target_username,
    requestedRole: row.requested_role,
    requestedById: row.requested_by,
    requestedByName: row.requester_name,
    requestedByEmail: row.requester_email,
    status: row.status,
    reviewedById: row.reviewed_by,
    reviewedByName: row.reviewer_name,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

const administratorOfRecordQuery = `
  SELECT u.id, u.email, u.username, u.name, u.role, u.created_at
  FROM users u
  LEFT JOIN system_metadata m
    ON m.key = 'administrator_of_record_user_id' AND m.value = u.id
  WHERE u.role = 'admin'
  ORDER BY CASE WHEN m.value IS NOT NULL THEN 0 ELSE 1 END, u.created_at ASC, lower(u.name) ASC, u.id ASC
  LIMIT 1
`;

export async function getAdministratorOfRecord(client?: DatabaseClient): Promise<TeamUserView> {
  const database = client ?? getDb();
  if (!client) await assertStandaloneDataset();
  const { rows } = await database.query<TeamUserRow>(administratorOfRecordQuery);
  if (!rows[0]) throw new TeamAccountError("An administrator of record must exist before a promotion can be requested.", 409);
  return toTeamUser(rows[0]);
}

export async function setAdministratorOfRecord(userId: string, actorId: string): Promise<TeamUserView> {
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const actor = await client.query<{ role: Role }>("SELECT role FROM users WHERE id = $1", [actorId]);
    if (actor.rows[0]?.role !== "admin") throw new TeamAccountError("Only administrators can change the administrator of record.", 403);
    const target = await client.query<{ id: string; role: Role }>("SELECT id, role FROM users WHERE id = $1", [userId]);
    if (!target.rows[0]) throw new TeamAccountError("The selected account could not be found.", 404);
    if (target.rows[0].role !== "admin") throw new TeamAccountError("The administrator of record must be an administrator.", 400);
    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO system_metadata (key, value, updated_at) VALUES ('administrator_of_record_user_id', $1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [userId, now],
    );
    await client.query(
      `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
       VALUES ($1, $2, 'team.administrator_of_record_changed', 'system_metadata', 'administrator_of_record_user_id', $3, $4)`,
      [randomUUID(), actorId, JSON.stringify({ administratorId: userId, synthetic: true }), now],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return getAdministratorOfRecord();
}

export async function getTeamUsers(): Promise<TeamUserView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<TeamUserRow>(
    `SELECT id, email, username, name, role, created_at
     FROM users
     ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, lower(name)`,
  );
  return rows.map(toTeamUser);
}

export async function createManagerAccount(
  input: { name: string; username: string; email: string; password: string },
  actorId: string,
): Promise<TeamUserView> {
  await assertStandaloneDataset();
  const id = randomUUID();
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  try {
    await getDb().query(
      `INSERT INTO users (id, email, username, name, role, password_hash, created_at)
       VALUES ($1, $2, $3, $4, 'manager', $5, $6)`,
      [id, email, username, name, hashPassword(input.password), now],
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new TeamAccountError("An account with that email or username already exists.");
    }
    throw error;
  }

  await getDb().query(
    `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
     VALUES ($1, $2, 'team.user_created', 'user', $3, $4, $5)`,
    [randomUUID(), actorId, id, JSON.stringify({ role: "manager", synthetic: true }), now],
  );

  const { rows } = await getDb().query<TeamUserRow>(
    "SELECT id, email, username, name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  if (!rows[0]) throw new TeamAccountError("The manager account was created but could not be loaded.", 500);
  return toTeamUser(rows[0]);
}

export async function getTeamRoleChangeRequests(status?: TeamRoleChangeRequestStatus): Promise<TeamRoleChangeRequestView[]> {
  await assertStandaloneDataset();
  const where = status ? "WHERE r.status = $1" : "";
  const values = status ? [status] : [];
  const { rows } = await getDb().query<RoleChangeRequestRow>(
    `SELECT r.id, r.target_user_id, target.name AS target_name, target.email AS target_email, target.username AS target_username,
       r.requested_role, r.requested_by, requester.name AS requester_name, requester.email AS requester_email,
       r.status, r.reviewed_by, reviewer.name AS reviewer_name, r.review_note, r.created_at, r.reviewed_at
     FROM team_role_change_requests r
     JOIN users target ON target.id = r.target_user_id
     JOIN users requester ON requester.id = r.requested_by
     LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
     ${where}
     ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC`,
    values,
  );
  return rows.map(toRoleChangeRequest);
}

async function getTeamRoleChangeRequest(client: DatabaseClient, requestId: string): Promise<TeamRoleChangeRequestView | null> {
  const { rows } = await client.query<RoleChangeRequestRow>(
    `SELECT r.id, r.target_user_id, target.name AS target_name, target.email AS target_email, target.username AS target_username,
       r.requested_role, r.requested_by, requester.name AS requester_name, requester.email AS requester_email,
       r.status, r.reviewed_by, reviewer.name AS reviewer_name, r.review_note, r.created_at, r.reviewed_at
     FROM team_role_change_requests r
     JOIN users target ON target.id = r.target_user_id
     JOIN users requester ON requester.id = r.requested_by
     LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
     WHERE r.id = $1`,
    [requestId],
  );
  return rows[0] ? toRoleChangeRequest(rows[0]) : null;
}

export async function requestManagerPromotion(targetUserId: string, actorId: string): Promise<TeamRoleChangeRequestView> {
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const actorResult = await client.query<TeamUserRow>("SELECT id, email, username, name, role, created_at FROM users WHERE id = $1", [actorId]);
    const actor = actorResult.rows[0];
    if (!actor) throw new TeamAccountError("The requesting account could not be found.", 404);
    if (actor.role !== "admin" && actor.role !== "manager") throw new TeamAccountError("Only staff accounts can request a manager promotion.", 403);

    const targetResult = await client.query<TeamUserRow>("SELECT id, email, username, name, role, created_at FROM users WHERE id = $1 FOR UPDATE", [targetUserId]);
    const target = targetResult.rows[0];
    if (!target) throw new TeamAccountError("The customer account could not be found.", 404);
    if (target.role !== "attendee") throw new TeamAccountError("Only a Customer account can be submitted for manager approval.", 409);

    const existing = await client.query<{ id: string }>("SELECT id FROM team_role_change_requests WHERE target_user_id = $1 AND status = 'pending' LIMIT 1", [targetUserId]);
    if (existing.rows[0]) throw new TeamAccountError("A manager promotion request is already pending for this customer.", 409);
    const administrator = await getAdministratorOfRecord(client);
    const requestId = `team-role-request-${randomUUID()}`;
    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO team_role_change_requests (id, target_user_id, requested_role, requested_by, status, created_at)
       VALUES ($1, $2, 'manager', $3, 'pending', $4)`,
      [requestId, targetUserId, actorId, now],
    );
    await client.query(
      `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
       VALUES ($1, $2, 'team.role_promotion_requested', 'team_role_change_request', $3, $4, $5)`,
      [randomUUID(), actorId, requestId, JSON.stringify({ targetUserId, requestedRole: "manager", administratorOfRecordId: administrator.id, synthetic: true }), now],
    );
    await queueCorrespondence({
      templateSlug: "manager-promotion-request",
      triggerKey: "team.role_promotion_requested",
      recipientEmail: administrator.email,
      recipientName: administrator.name,
      entityType: "team_role_change_request",
      entityId: requestId,
      payload: {
        target_name: target.name,
        target_username: target.username,
        target_email: target.email,
        requester_name: actor.name,
        requester_username: actor.username,
        requester_email: actor.email,
        approval_link: "/admin/team",
      },
      idempotencyKey: `team-role-request:${requestId}:administrator-notification`,
      client,
    });
    await client.query("COMMIT");
    const created = await getTeamRoleChangeRequest(client, requestId);
    if (!created) throw new TeamAccountError("The promotion request was created but could not be loaded.", 500);
    return created;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function queuePromotionDecisionNotifications(
  client: DatabaseClient,
  request: TeamRoleChangeRequestView,
  administrator: TeamUserView,
  decision: "approved" | "denied",
  reviewNote: string,
): Promise<void> {
  const recipients = new Map<string, { email: string; name: string }>();
  for (const recipient of [
    { email: request.targetEmail, name: request.targetName },
    { email: request.requestedByEmail, name: request.requestedByName },
    { email: administrator.email, name: administrator.name },
  ]) {
    recipients.set(recipient.email.trim().toLowerCase(), recipient);
  }
  const templateSlug = decision === "approved" ? "manager-promotion-approved" : "manager-promotion-denied";
  for (const recipient of recipients.values()) {
    await queueCorrespondence({
      templateSlug,
      triggerKey: "team.role_promotion_reviewed",
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      entityType: "team_role_change_request",
      entityId: request.id,
      payload: {
        target_name: request.targetName,
        target_username: request.targetUsername,
        target_email: request.targetEmail,
        requester_name: request.requestedByName,
        requester_email: request.requestedByEmail,
        reviewer_name: administrator.name,
        decision: decision === "approved" ? "approved" : "denied",
        review_note: reviewNote,
        team_link: "/admin/team",
      },
      idempotencyKey: `team-role-request:${request.id}:decision:${decision}:${recipient.email.trim().toLowerCase()}`,
      client,
    });
  }
}

export async function reviewManagerPromotion(
  requestId: string,
  decision: "approve" | "deny",
  reviewerId: string,
  reviewNote = "",
): Promise<TeamRoleChangeRequestView> {
  await assertStandaloneDataset();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const requestRow = await client.query<{ id: string; target_user_id: string; status: TeamRoleChangeRequestStatus }>(
      "SELECT id, target_user_id, status FROM team_role_change_requests WHERE id = $1 FOR UPDATE",
      [requestId],
    );
    const pending = requestRow.rows[0];
    if (!pending) throw new TeamAccountError("The promotion request could not be found.", 404);
    if (pending.status !== "pending") throw new TeamAccountError("This promotion request has already been reviewed.", 409);

    const reviewerResult = await client.query<TeamUserRow>("SELECT id, email, username, name, role, created_at FROM users WHERE id = $1", [reviewerId]);
    const reviewer = reviewerResult.rows[0];
    if (!reviewer || reviewer.role !== "admin") throw new TeamAccountError("Only an administrator can review promotion requests.", 403);
    const administrator = await getAdministratorOfRecord(client);
    if (administrator.id !== reviewerId) throw new TeamAccountError("Only the current administrator of record can review this request.", 403);

    const targetResult = await client.query<TeamUserRow>("SELECT id, email, username, name, role, created_at FROM users WHERE id = $1 FOR UPDATE", [pending.target_user_id]);
    const target = targetResult.rows[0];
    if (!target) throw new TeamAccountError("The requested customer account no longer exists.", 409);
    const note = reviewNote.trim().slice(0, 1000);
    if (decision === "approve") {
      if (target.role !== "attendee") throw new TeamAccountError("The target account is no longer a Customer, so it cannot be promoted.", 409);
      await client.query("UPDATE users SET role = 'manager' WHERE id = $1", [target.id]);
    }
    const status: "approved" | "denied" = decision === "approve" ? "approved" : "denied";
    const now = new Date().toISOString();
    await client.query(
      `UPDATE team_role_change_requests SET status = $2, reviewed_by = $3, review_note = $4, reviewed_at = $5 WHERE id = $1`,
      [requestId, status, reviewerId, note, now],
    );
    await client.query(
      `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
       VALUES ($1, $2, $3, 'team_role_change_request', $4, $5, $6)`,
      [randomUUID(), reviewerId, decision === "approve" ? "team.role_promotion_approved" : "team.role_promotion_denied", requestId, JSON.stringify({ targetUserId: target.id, roleChanged: decision === "approve", synthetic: true }), now],
    );
    const reviewed = await getTeamRoleChangeRequest(client, requestId);
    if (!reviewed) throw new TeamAccountError("The promotion decision was saved but could not be loaded.", 500);
    await queuePromotionDecisionNotifications(client, reviewed, administrator, status, note);
    await client.query("COMMIT");
    return reviewed;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateTeamUserRole(id: string, role: Role, actorId: string): Promise<TeamUserView> {
  await assertStandaloneDataset();
  if (id === actorId) throw new TeamAccountError("You cannot change your own role.", 400);

  const actorResult = await getDb().query<{ role: Role }>("SELECT role FROM users WHERE id = $1", [actorId]);
  if (actorResult.rows[0]?.role !== "admin") throw new TeamAccountError("Only administrators can make direct role changes.", 403);
  const currentResult = await getDb().query<TeamUserRow>(
    "SELECT id, email, username, name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  const current = currentResult.rows[0];
  if (!current) throw new TeamAccountError("The account could not be found.", 404);
  if (current.role === role) return toTeamUser(current);
  if (current.role === "attendee" && role === "manager") {
    throw new TeamAccountError("Customer-to-manager changes require Administrator of Record approval.", 409);
  }

  if (current.role === "admin" && role !== "admin") {
    const adminCount = await getDb().query<{ count: number }>("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");
    if (Number(adminCount.rows[0]?.count ?? 0) <= 1) {
      throw new TeamAccountError("The last administrator cannot be demoted.", 400);
    }
  }

  const now = new Date().toISOString();
  await getDb().query("UPDATE users SET role = $2 WHERE id = $1", [id, role]);
  await getDb().query(
    `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
     VALUES ($1, $2, 'team.user_role_changed', 'user', $3, $4, $5)`,
    [randomUUID(), actorId, id, JSON.stringify({ from: current.role, to: role, synthetic: true }), now],
  );

  const updatedResult = await getDb().query<TeamUserRow>(
    "SELECT id, email, username, name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  if (!updatedResult.rows[0]) throw new TeamAccountError("The account role changed but could not be loaded.", 500);
  return toTeamUser(updatedResult.rows[0]);
}
