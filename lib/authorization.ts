import type { Role, User } from "@/lib/types";

/**
 * Capabilities are intentionally narrower than roles. This keeps the admin
 * surface understandable today and gives us room to add more roles without
 * scattering role-name checks through pages and API handlers.
 */
export type Capability =
  | "admin.access"
  | "content.manage"
  | "webinars.manage"
  | "catalog.manage"
  | "orders.manage"
  | "registrations.view"
  | "analytics.view"
  | "appearance.manage"
  | "forms.manage"
  | "media.manage"
  | "email.manage"
  | "crm.manage"
  | "messaging.manage"
  | "inventory.manage"
  | "settings.manage"
  | "team.manage"
  | "team.view"
  | "team.promote"
  | "team.approve";

const allCapabilities: readonly Capability[] = [
  "admin.access",
  "content.manage",
  "webinars.manage",
  "catalog.manage",
  "orders.manage",
  "registrations.view",
  "analytics.view",
  "appearance.manage",
  "forms.manage",
  "media.manage",
  "email.manage",
  "crm.manage",
  "messaging.manage",
  "inventory.manage",
  "settings.manage",
  "team.manage",
  "team.view",
  "team.promote",
  "team.approve",
];

const capabilitiesByRole: Record<Role, readonly Capability[]> = {
  admin: allCapabilities,
  manager: [
    "admin.access",
    "content.manage",
    "webinars.manage",
    "catalog.manage",
    "orders.manage",
    "registrations.view",
    "analytics.view",
    "appearance.manage",
    "forms.manage",
    "media.manage",
    "email.manage",
    "team.view",
    "team.promote",
  ],
  attendee: [],
};

export function hasCapability(
  user: Pick<User, "role"> | null | undefined,
  capability: Capability,
): boolean {
  return Boolean(user && capabilitiesByRole[user.role].includes(capability));
}

export function isStaff(user: Pick<User, "role"> | null | undefined): boolean {
  return hasCapability(user, "admin.access");
}

export function roleLabel(role: Role): string {
  if (role === "admin") return "Administrator";
  if (role === "manager") return "Manager";
  return "Customer";
}
