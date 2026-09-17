import { randomUUID } from "node:crypto";
import { assertStandaloneDataset, getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { Role, User } from "@/lib/types";

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

type TeamUserRow = { id: string; email: string; name: string; role: Role; created_at: string };

function toTeamUser(row: TeamUserRow): TeamUserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

export async function getTeamUsers(): Promise<TeamUserView[]> {
  await assertStandaloneDataset();
  const { rows } = await getDb().query<TeamUserRow>(
    `SELECT id, email, name, role, created_at
     FROM users
     ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, lower(name)`,
  );
  return rows.map(toTeamUser);
}

export async function createManagerAccount(
  input: { name: string; email: string; password: string },
  actorId: string,
): Promise<TeamUserView> {
  await assertStandaloneDataset();
  const id = randomUUID();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  try {
    await getDb().query(
      `INSERT INTO users (id, email, name, role, password_hash, created_at)
       VALUES ($1, $2, $3, 'manager', $4, $5)`,
      [id, email, name, hashPassword(input.password), now],
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new TeamAccountError("An account with that email already exists.");
    }
    throw error;
  }

  await getDb().query(
    `INSERT INTO audit_events (id, actor_id, event_type, entity_type, entity_id, metadata_json, created_at)
     VALUES ($1, $2, 'team.user_created', 'user', $3, $4, $5)`,
    [randomUUID(), actorId, id, JSON.stringify({ role: "manager", synthetic: true }), now],
  );

  const { rows } = await getDb().query<TeamUserRow>(
    "SELECT id, email, name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  if (!rows[0]) throw new TeamAccountError("The manager account was created but could not be loaded.", 500);
  return toTeamUser(rows[0]);
}

export async function updateTeamUserRole(id: string, role: Role, actorId: string): Promise<TeamUserView> {
  await assertStandaloneDataset();
  if (id === actorId) throw new TeamAccountError("You cannot change your own role.", 400);

  const currentResult = await getDb().query<TeamUserRow>(
    "SELECT id, email, name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  const current = currentResult.rows[0];
  if (!current) throw new TeamAccountError("The account could not be found.", 404);
  if (current.role === role) return toTeamUser(current);

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
    "SELECT id, email, name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  if (!updatedResult.rows[0]) throw new TeamAccountError("The account role changed but could not be loaded.", 500);
  return toTeamUser(updatedResult.rows[0]);
}
