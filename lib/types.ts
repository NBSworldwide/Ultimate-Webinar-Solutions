import type { ThemeSettingsValues } from "@/lib/theme-presets";

export type Role = "admin" | "attendee";
export type PageStatus = "draft" | "published" | "archived";
export type PageBlockType = "hero" | "rich_text" | "image" | "cta" | "spacer" | "product_grid" | "product_category" | "sale_grid" | "gallery" | "testimonial_grid";
export type WebinarStatus = "draft" | "published" | "sold_out" | "completed";
export type WebinarVisibility = "public" | "private";
export type { EmailProvider, StreamingProvider } from "@/lib/integration-catalog";
export type PricingModel = "fixed_per_seat" | "split_total_value";
export type PricingRounding = "exact_cents" | "nearest_dollar" | "round_up_dollar";
export type GiveawayOutcome = "winner" | "not_winner";
export type SeatStatus = "available" | "held" | "sold";
export type PaymentStatus = "free" | "paid" | "pending" | "refunded";
export type ProductStatus = "draft" | "active" | "archived";
export type ProductVariantStatus = ProductStatus;
export type CouponDiscountType = "percentage" | "fixed_amount" | "free_shipping";
export type CouponStatus = "draft" | "active" | "paused" | "expired" | "archived";
export type InventorySourceType = "shopify" | "square" | "cin7" | "custom_api";
export type InventorySyncMode = "local" | "external" | "hybrid";
export type InventorySourceStatus = "draft" | "active" | "paused" | "error";
export type ProductPaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type FulfillmentStatus = "unfulfilled" | "packing" | "shipped" | "delivered" | "cancelled";
export type EmailTemplateStatus = "draft" | "active" | "archived";
export type EmailSequenceStatus = "draft" | "active" | "paused" | "archived";
export type EmailMessageType = "transactional" | "marketing";
export type EmailOutboxStatus = "queued" | "sending" | "sent" | "failed" | "cancelled";
export type SmsMessageType = "transactional" | "marketing";
export type SmsTemplateStatus = "draft" | "active" | "archived";
export type SmsOutboxStatus = "queued" | "sending" | "sent" | "failed" | "cancelled" | "suppressed";
export type CrmLifecycleStage = "lead" | "attendee" | "customer" | "inactive";
export type CrmActivityType = "registration" | "order" | "email" | "note" | "system";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface SiteSettings {
  id: string;
  displayName: string;
  legalName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  logoAlt: string;
  primaryEmail: string;
  supportEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  websiteUrl: string;
  timezone: string;
  currency: string;
  supportUrl: string;
  privacyUrl: string;
  termsUrl: string;
  shippingPolicyUrl: string;
  businessHours: string;
  linkedinUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  ageGateEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export type ThemeSettings = ThemeSettingsValues & {
  id: string;
  updatedBy: string | null;
  updatedAt: string;
};

export interface IntegrationSettingsView {
  streamingProvider: import("@/lib/integration-catalog").StreamingProvider | null;
  emailProvider: import("@/lib/integration-catalog").EmailProvider | null;
  streamingValues: Record<string, string>;
  emailValues: Record<string, string>;
  savedStreamingSecrets: string[];
  savedEmailSecrets: string[];
  updatedAt: string;
}

export interface PageBlock {
  id: string;
  type: PageBlockType;
  data: Record<string, string | number>;
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: PageStatus;
  blocks: PageBlock[];
  seoTitle: string;
  seoDescription: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  revision: number;
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
  visibility: WebinarVisibility;
  provider: string;
  hostName: string;
  accent: string;
  replayUrl: string | null;
  priceCents: number;
  capacity: number;
  sold: number;
  held: number;
  available: number;
  revenueCents: number;
  giveawayEnabled: boolean;
}

export type PublicWebinarListItem = Omit<WebinarListItem, "revenueCents" | "visibility">;

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
  pricingModel: PricingModel;
  referenceValueCents: number | null;
  roundingMode: PricingRounding;
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
  giveawayOutcome: GiveawayOutcome | null;
  giveawayResultAt: string | null;
  giveawayPrizeName: string | null;
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
  prizeProductId: string | null;
  prizeProductName: string | null;
  prizeProductSku: string | null;
  prizeProductPriceCents: number | null;
  claimDeadline: string | null;
  fulfillmentNotes: string;
}

export type PublicWebinarDetails = Omit<WebinarDetails, "revenueCents" | "visibility" | "registrations" | "latestWinner" | "giveawayEnabled" | "prizeProductId" | "prizeProductName" | "prizeProductSku" | "prizeProductPriceCents" | "claimDeadline" | "fulfillmentNotes">;

export interface WebinarInviteView {
  id: string;
  email: string;
  expiresAt: string;
  revokedAt: string | null;
  lastVerifiedAt: string | null;
  redeemedAt: string | null;
  createdAt: string;
}

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

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  imageUrl: string | null;
  priceCents: number;
  inventoryQuantity: number;
  weightGrams: number;
  status: ProductStatus;
  compareAtPriceCents: number | null;
  salePriceCents: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  variants?: ProductVariantView[];
}

export interface ProductVariantView {
  id: string;
  productId: string;
  name: string;
  sku: string;
  optionValues: Record<string, string>;
  priceCents: number;
  compareAtPriceCents: number | null;
  salePriceCents: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  inventoryQuantity: number;
  weightGrams: number;
  status: ProductVariantStatus;
}

export interface TestimonialView {
  id: string;
  customerName: string;
  quote: string;
  rating: number;
  source: string;
  productName: string | null;
  createdAt: string;
}

export interface RelatedProductView {
  productId: string;
  relatedProductId: string;
  relationType: "related" | "recommended" | "frequently_bought_together";
  relatedProduct: ProductListItem;
}

export interface CouponView {
  id: string;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderCents: number;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  status: CouponStatus;
  redemptionCount: number;
  productIds: string[];
}

export interface InventorySourceView {
  id: string;
  name: string;
  sourceType: InventorySourceType;
  baseUrl: string;
  syncMode: InventorySyncMode;
  safetyStock: number;
  status: InventorySourceStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  mappingCount: number;
  hasCredentials: boolean;
}

export interface OrderItemView {
  id: string;
  productId: string;
  variantId: string | null;
  variantName: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingName: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingRegion: string;
  shippingPostalCode: string;
  shippingCountry: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  paymentStatus: ProductPaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  items: OrderItemView[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateListItem {
  id: string;
  slug: string;
  name: string;
  triggerKey: string;
  messageType: EmailMessageType;
  subject: string;
  preheader: string;
  htmlBody: string;
  textBody: string;
  status: EmailTemplateStatus;
  version: number;
  updatedAt: string;
}

export interface EmailTemplateRevisionView {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  preheader: string;
  htmlBody: string;
  textBody: string;
  editedBy: string | null;
  createdAt: string;
}

export interface EmailSequenceStepView {
  id: string;
  stepOrder: number;
  delayMinutes: number;
  templateId: string;
  templateName: string;
  templateSlug: string;
}

export interface EmailSequenceView {
  id: string;
  slug: string;
  name: string;
  triggerKey: string;
  status: EmailSequenceStatus;
  steps: EmailSequenceStepView[];
  updatedAt: string;
}

export interface EmailOutboxView {
  id: string;
  triggerKey: string;
  recipientEmail: string;
  recipientName: string;
  entityType: string;
  entityId: string;
  templateName: string | null;
  status: EmailOutboxStatus;
  attempts: number;
  scheduledAt: string;
  sentAt: string | null;
  lastError: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface SmsTemplateView {
  id: string;
  slug: string;
  name: string;
  triggerKey: string;
  messageType: SmsMessageType;
  body: string;
  status: SmsTemplateStatus;
  version: number;
  updatedAt: string;
}

export interface SmsTemplateRevisionView {
  id: string;
  templateId: string;
  version: number;
  body: string;
  editedBy: string | null;
  createdAt: string;
}

export interface SmsOutboxView {
  id: string;
  triggerKey: string;
  recipientPhone: string;
  recipientName: string;
  entityType: string;
  entityId: string;
  templateName: string | null;
  messageBody: string;
  status: SmsOutboxStatus;
  attempts: number;
  scheduledAt: string;
  providerMessageId: string | null;
  sentAt: string | null;
  lastError: string | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface CrmTagView {
  id: string;
  slug: string;
  name: string;
  color: string;
}

export interface CrmNoteView {
  id: string;
  body: string;
  createdBy: string | null;
  createdAt: string;
}

export interface CrmActivityView {
  id: string;
  activityType: CrmActivityType;
  subject: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  occurredAt: string;
}

export interface CrmContactView {
  id: string;
  email: string;
  name: string;
  phone: string;
  company: string;
  source: string;
  lifecycleStage: CrmLifecycleStage;
  marketingConsent: boolean;
  smsConsent: boolean;
  smsOptedOutAt: string | null;
  unsubscribedAt: string | null;
  tags: CrmTagView[];
  notes: CrmNoteView[];
  activities: CrmActivityView[];
  createdAt: string;
  updatedAt: string;
}
