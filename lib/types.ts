export type Role = "admin" | "attendee";
export type WebinarStatus = "draft" | "published" | "sold_out" | "completed";
export type SeatStatus = "available" | "held" | "sold";
export type PaymentStatus = "paid" | "pending" | "refunded";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface WebinarListItem {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  status: WebinarStatus;
  provider: string;
  hostName: string;
  accent: string;
  capacity: number;
  sold: number;
  held: number;
  available: number;
  revenueCents: number;
}

export type PublicWebinarListItem = Omit<WebinarListItem, "revenueCents">;

export interface SeatView {
  id: string;
  number: number;
  status: SeatStatus;
}

export interface TierView {
  id: string;
  name: string;
  priceCents: number;
  capacity: number;
  seats: SeatView[];
}

export interface RegistrationView {
  id: string;
  registrationGroupId: string;
  webinarId: string;
  webinarTitle: string;
  tierName: string;
  seatNumber: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentStatus: PaymentStatus;
  accessStatus: "active" | "removed";
  isWinner: boolean;
  priceCents: number;
  createdAt: string;
}

export interface CustomerReplayAccess {
  registrationId: string;
  webinarTitle: string;
  replayLabel: string;
  replayUrl: string | null;
  startsAt: string;
  timezone: string;
  accessStatus: "active" | "removed";
  paymentStatus: PaymentStatus;
}

export interface WebinarDetails extends WebinarListItem {
  hostBio: string;
  longDescription: string;
  replayLabel: string;
  replayUrl: string | null;
  tiers: TierView[];
  registrations: RegistrationView[];
  latestWinner: RegistrationView | null;
}

export type PublicWebinarDetails = Omit<WebinarDetails, "revenueCents" | "registrations" | "latestWinner">;

export interface DashboardData {
  stats: {
    upcoming: number;
    registrations: number;
    revenueCents: number;
    availableSeats: number;
  };
  webinars: WebinarListItem[];
  recentRegistrations: RegistrationView[];
}

export interface HoldResult {
  holdToken: string;
  expiresAt: string;
  seats: Array<{ id: string; number: number; tierName: string }>;
}
