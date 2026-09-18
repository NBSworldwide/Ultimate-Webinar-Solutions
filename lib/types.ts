import type { ThemeSettingsValues } from "@/lib/theme-presets";

export type Role = "admin" | "manager" | "attendee";
export type PageStatus = "draft" | "published" | "archived";
export type PageBlockType = "hero" | "heading" | "rich_text" | "image" | "image_box" | "icon" | "icon_box" | "video" | "button" | "cta" | "product_grid" | "product_category" | "sale_grid" | "gallery" | "testimonial_grid" | "navigation_menu" | "form" | "location_index" | "location_detail" | "html" | "map" | "spacer" | "container";
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
  username: string;
  name: string;
  role: Role;
}

export interface AccountProfile extends User {
  phone: string;
  mobilePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface AccountProfileInput {
  name: string;
  email: string;
  phone: string;
  mobilePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export type TeamRoleChangeRequestStatus = "pending" | "approved" | "denied" | "cancelled";

export interface TeamRoleChangeRequestView {
  id: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  targetUsername: string;
  requestedRole: "manager";
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  status: TeamRoleChangeRequestStatus;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface SiteSettings {
  id: string;
  displayName: string;
  legalName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  logoAlt: string;
  faviconUrl: string;
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

export type FormStatus = "draft" | "published" | "archived";
export type FormFieldType = "text" | "textarea" | "select" | "radio" | "checkbox" | "number" | "name" | "email" | "range" | "captcha" | "consent" | "phone" | "datetime" | "address" | "map" | "url" | "layout" | "page_break" | "divider" | "rich_text" | "html" | "signature" | "hidden";
export type FormConfirmationType = "message" | "page" | "url";
export type FormEntryPaymentStatus = "none" | "pending" | "paid" | "refunded";
export type FormEntryFilter = "all" | "unread" | "starred" | "spam" | "trash" | "payments";
export type FormMailerProvider = "native" | "smtp" | "brevo" | "mailjet" | "sendgrid" | "gmail" | "resend" | "mailgun" | "ses" | "postmark";

export interface AppearanceSettings {
  id: string;
  contentWidth: number;
  containerPadding: number;
  columnGap: number;
  rowGap: number;
  pageTitleSelector: string;
  stretchSections: boolean;
  defaultPageLayout: "full_width" | "boxed";
  breakpoints: Record<string, number>;
  customCss: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface GlobalColorToken {
  id: string;
  tokenKey: string;
  name: string;
  value: string;
  isSystem: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface GlobalTypographyToken {
  id: string;
  tokenKey: string;
  name: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  fontStyle: "normal" | "italic" | "oblique";
  responsive: Record<string, { fontSize?: number; lineHeight?: number; letterSpacing?: number }>;
  isSystem: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string;
  caption: string;
  status: "active" | "trashed";
  createdAt: string;
  updatedAt: string;
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormCondition {
  fieldId: string;
  operator: "equals" | "not_equals" | "contains" | "not_empty";
  value: string;
}

export interface FormField {
  id: string;
  formId: string;
  sortOrder: number;
  fieldType: FormFieldType;
  label: string;
  description: string;
  placeholder: string;
  fieldId: string;
  isRequired: boolean;
  options: FormFieldOption[];
  defaultValue: string;
  validation: Record<string, string | number | boolean>;
  conditional: FormCondition | null;
  settings: Record<string, string | number | boolean>;
}

export interface FormNotification {
  id: string;
  formId: string;
  sortOrder: number;
  name: string;
  enabled: boolean;
  recipientEmails: string[];
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  messageHtml: string;
  condition: FormCondition | null;
  advanced: Record<string, string | number | boolean>;
}

export interface FormConfirmation {
  id: string;
  formId: string;
  confirmationType: FormConfirmationType;
  messageHtml: string;
  pageUrl: string;
  redirectUrl: string;
  autoScroll: boolean;
  entryPreview: boolean;
}

export interface FormSettings {
  enableConditionalLogic: boolean;
  storeSpamEntries: boolean;
  minimumSubmitSeconds: number;
  countryFilter: string[];
  keywordFilter: string[];
  captchaProvider: "none" | "built_in" | "recaptcha" | "hcaptcha" | "turnstile" | "custom";
  aiEnabled: boolean;
}

export interface FormDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  status: FormStatus;
  submitButtonText: string;
  submittingText: string;
  settings: FormSettings;
  fields: FormField[];
  notifications: FormNotification[];
  confirmation: FormConfirmation;
  entryCount: number;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface FormEntry {
  id: string;
  formId: string;
  formName: string;
  entryNumber: number;
  values: Record<string, string | string[]>;
  notes: string;
  isRead: boolean;
  isStarred: boolean;
  isSpam: boolean;
  trashedAt: string | null;
  paymentStatus: FormEntryPaymentStatus;
  ipAddress: string | null;
  ipHash: string | null;
  country: string | null;
  userAgent: string | null;
  referrer: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormEntryAuditEvent {
  id: string;
  action: string;
  actorName: string | null;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface FormEntryDelivery {
  id: string;
  notificationName: string | null;
  provider: string;
  recipientEmail: string;
  status: "queued" | "sent" | "failed" | "skipped";
  errorMessage: string | null;
  attemptedAt: string | null;
  createdAt: string;
}

export interface FormEntryDetail extends FormEntry {
  fieldLabels: Record<string, string>;
  audit: FormEntryAuditEvent[];
  deliveries: FormEntryDelivery[];
  previousId: string | null;
  nextId: string | null;
}

export interface FormMailerSettings {
  primaryProvider: FormMailerProvider;
  backupProvider: FormMailerProvider | null;
  fromName: string;
  fromEmail: string;
  forceFrom: boolean;
  settings: Record<string, string | number | boolean>;
  lastTestedAt: string | null;
  savedSecrets: string[];
  updatedAt: string;
}

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
  style?: PageBlockStyle;
  layout?: PageBlockLayout;
  children?: PageBlock[];
}

export type PageContainerMode = "flex" | "grid";
export type PageContainerContentWidth = "boxed" | "full";
export type PageContainerSpacing = "global" | "custom";
export type PageContainerMeasureUnit = "px" | "%" | "em" | "rem" | "vw" | "vh";
export type PageContainerDirection = "row" | "column" | "row-reverse" | "column-reverse";
export type PageContainerJustify = "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";
export type PageContainerAlign = "start" | "center" | "end" | "stretch";
export type PageContainerWrap = "nowrap" | "wrap";

export interface PageBlockLayout {
  mode?: PageContainerMode;
  contentWidth?: PageContainerContentWidth;
  spacing?: PageContainerSpacing;
  width?: number;
  widthUnit?: PageContainerMeasureUnit;
  minHeight?: number;
  minHeightUnit?: PageContainerMeasureUnit;
  direction?: PageContainerDirection;
  justifyContent?: PageContainerJustify;
  alignItems?: PageContainerAlign;
  columnGap?: number;
  rowGap?: number;
  wrap?: PageContainerWrap;
  columns?: number;
  rows?: number;
  autoFlow?: "row" | "column";
  justifyItems?: PageContainerAlign;
  gridOutline?: boolean;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  htmlTag?: "div" | "header" | "footer" | "main" | "article" | "section" | "aside" | "nav" | "a";
  linkUrl?: string;
  linkTarget?: "same" | "new";
  responsive?: Partial<Record<PageStyleDevice, PageBlockLayoutResponsive>>;
}

export type PageStyleDevice = "widescreen" | "desktop" | "laptop" | "tabletLandscape" | "tabletPortrait" | "mobileLandscape" | "mobilePortrait";
export interface PageBlockLayoutResponsive {
  contentWidth?: PageContainerContentWidth;
  width?: number;
  widthUnit?: PageContainerMeasureUnit;
  minHeight?: number;
  minHeightUnit?: PageContainerMeasureUnit;
  direction?: PageContainerDirection;
  justifyContent?: PageContainerJustify;
  alignItems?: PageContainerAlign;
  columnGap?: number;
  rowGap?: number;
  wrap?: PageContainerWrap;
  columns?: number;
  rows?: number;
  autoFlow?: "row" | "column";
  justifyItems?: PageContainerAlign;
}
export type PageStyleNumber = Partial<Record<PageStyleDevice, number>>;
export interface PageStyleEdges { top?: number; right?: number; bottom?: number; left?: number; }
export type PageStyleBox = Partial<Record<PageStyleDevice, PageStyleEdges>>;
export type PageStyleBorderType = "default" | "none" | "solid" | "double" | "dotted" | "dashed" | "groove";
export type PageStyleBackgroundMode = "none" | "classic" | "gradient" | "video" | "slideshow";
export type PageStyleGradientType = "linear" | "radial";
export type PageStyleMaskShape = "circle" | "oval" | "pill" | "pill-vertical" | "triangle" | "diamond" | "hexagon" | "blob" | "custom";
export type PageStyleAspectRatio = "1/1" | "3/2" | "4/3" | "16/9" | "21/9" | "9/16";

export interface PageBlockStyle {
  widthMode?: "default" | "full" | "inline" | "custom";
  width?: PageStyleNumber;
  maxWidth?: PageStyleNumber;
  height?: PageStyleNumber;
  opacity?: PageStyleNumber;
  alignSelf?: "default" | "start" | "center" | "end" | "stretch";
  position?: "default" | "relative" | "absolute" | "fixed";
  zIndex?: number;
  margin?: PageStyleBox;
  padding?: PageStyleBox;
  typography?: {
    fontFamily?: "default" | "Manrope" | "DM Mono" | "Inter" | "Arial" | "Georgia" | "Verdana";
    fontSize?: PageStyleNumber;
    fontWeight?: number;
    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
    fontStyle?: "normal" | "italic" | "oblique";
    textDecoration?: "none" | "underline" | "overline" | "line-through";
    lineHeight?: PageStyleNumber;
    letterSpacing?: PageStyleNumber;
    wordSpacing?: PageStyleNumber;
    textAlign?: "left" | "center" | "right" | "justify";
    textStroke?: { width?: PageStyleNumber; color?: string };
    textShadow?: { horizontal?: PageStyleNumber; vertical?: PageStyleNumber; blur?: PageStyleNumber; color?: string };
  };
  background?: {
    mode?: PageStyleBackgroundMode;
    color?: string;
    image?: string;
    imageSize?: "auto" | "cover" | "contain";
    imagePosition?: "center" | "top" | "right" | "bottom" | "left";
    imageRepeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
    gradientType?: PageStyleGradientType;
    gradientStart?: string;
    gradientEnd?: string;
    gradientStartLocation?: number;
    gradientEndLocation?: number;
    angle?: PageStyleNumber;
    videoSource?: "youtube" | "vimeo" | "file";
    videoUrl?: string;
    videoFallbackImage?: string;
    videoStart?: number;
    videoEnd?: number;
    slideshowImages?: string[];
    slideshowInfinite?: boolean;
    slideshowDuration?: number;
    slideshowTransition?: "fade" | "slide";
    slideshowTransitionDuration?: number;
    slideshowLazyLoad?: boolean;
    slideshowKenBurns?: boolean;
  };
  hover?: { textColor?: string; backgroundColor?: string; opacity?: number; };
  border?: {
    type?: PageStyleBorderType;
    color?: string;
    width?: PageStyleBox;
    radius?: PageStyleBox;
    shadow?: { color?: string; horizontal?: number; vertical?: number; blur?: number; spread?: number; position?: "outline" | "inset"; };
  };
  mask?: { enabled?: boolean; shape?: PageStyleMaskShape; image?: string; };
  widget?: {
    aspectRatio?: PageStyleAspectRatio;
    imagePosition?: "left" | "top" | "right" | "bottom";
    imageAlign?: "left" | "center" | "right";
    imageSpacing?: number;
    contentSpacing?: number;
    imageWidth?: PageStyleNumber;
    imageHeight?: PageStyleNumber;
    imageOpacity?: PageStyleNumber;
    filter?: { blur?: PageStyleNumber; brightness?: PageStyleNumber; contrast?: PageStyleNumber; saturation?: PageStyleNumber; hue?: PageStyleNumber; };
    iconColor?: string;
    iconAlign?: "left" | "center" | "right";
    iconSize?: PageStyleNumber;
    iconRotate?: PageStyleNumber;
  };
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: PageStatus;
  isHomepage: boolean;
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

export type SiteTemplateKind = "header" | "footer";
export type SiteTemplateStatus = Exclude<PageStatus, "draft"> | "draft";

export interface SiteTemplate {
  id: string;
  kind: SiteTemplateKind;
  name: string;
  status: SiteTemplateStatus;
  isActive: boolean;
  blocks: PageBlock[];
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
