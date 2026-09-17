export type StreamingProvider = "cloudflare_stream" | "mux" | "amazon_ivs";
export type EmailProvider = "resend" | "postmark" | "sendgrid";

export type IntegrationField = {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  placeholder: string;
  help: string;
  secret?: boolean;
  required?: boolean;
};

export const streamingProviders: Array<{
  value: StreamingProvider;
  label: string;
  description: string;
  fields: IntegrationField[];
}> = [
  {
    value: "cloudflare_stream",
    label: "Cloudflare Stream",
    description: "Live ingest, automatic recording, and protected playback in one service.",
    fields: [
      { name: "accountId", label: "Cloudflare account ID", placeholder: "Account ID from the Cloudflare dashboard", help: "Used to create and manage live inputs." },
      { name: "apiToken", label: "Stream API token", type: "password", placeholder: "Paste the token with Stream permissions", help: "Keep this token server-side; it is used for live input and recording operations.", secret: true },
      { name: "webhookSecret", label: "Webhook signing secret", type: "password", placeholder: "Optional until webhooks are enabled", help: "Used later to authenticate stream-ended callbacks.", secret: true, required: false },
    ],
  },
  {
    value: "mux",
    label: "Mux Video",
    description: "Developer-focused live streaming with signed playback support.",
    fields: [
      { name: "tokenId", label: "Mux token ID", placeholder: "Token ID", help: "Use a token with Video Read and Write permissions." },
      { name: "tokenSecret", label: "Mux token secret", type: "password", placeholder: "Paste the token secret", help: "This secret is required for server-side Mux API calls.", secret: true },
      { name: "webhookSigningSecret", label: "Webhook signing secret", type: "password", placeholder: "Optional until webhooks are enabled", help: "Used later to authenticate Mux video lifecycle events.", secret: true, required: false },
    ],
  },
  {
    value: "amazon_ivs",
    label: "Amazon IVS",
    description: "AWS-managed low-latency channels with optional S3 recording.",
    fields: [
      { name: "region", label: "AWS region", placeholder: "us-east-1", help: "The IVS channel region." },
      { name: "accessKeyId", label: "AWS access key ID", placeholder: "AKIA…", help: "Use an IAM identity limited to the required IVS and recording operations." },
      { name: "secretAccessKey", label: "AWS secret access key", type: "password", placeholder: "Paste the secret access key", help: "This secret is used only by server-side AWS calls.", secret: true },
      { name: "recordingBucket", label: "Recording S3 bucket", placeholder: "Bucket name for recorded sessions", help: "Required when automatic recordings are stored through an IVS recording configuration." },
    ],
  },
];

export const emailProviders: Array<{
  value: EmailProvider;
  label: string;
  description: string;
  fields: IntegrationField[];
}> = [
  {
    value: "resend",
    label: "Resend",
    description: "Simple transactional email API with a low-friction developer setup.",
    fields: [
      { name: "apiKey", label: "Resend API key", type: "password", placeholder: "re_…", help: "Used by the server-side email delivery worker.", secret: true },
      { name: "fromEmail", label: "From address", type: "text", placeholder: "Webinars <hello@example.com>", help: "Use an address on a verified sending domain." },
      { name: "replyTo", label: "Reply-to address", type: "email", placeholder: "support@example.com", help: "Optional address for attendee replies.", required: false },
    ],
  },
  {
    value: "postmark",
    label: "Postmark",
    description: "Transactional email delivery with dedicated message streams and delivery tracking.",
    fields: [
      { name: "serverToken", label: "Postmark server token", type: "password", placeholder: "Server API token", help: "Use the token for the transactional server.", secret: true },
      { name: "fromEmail", label: "From address", type: "text", placeholder: "Webinars <hello@example.com>", help: "Use a verified sender signature or domain." },
      { name: "replyTo", label: "Reply-to address", type: "email", placeholder: "support@example.com", help: "Optional address for attendee replies.", required: false },
      { name: "messageStream", label: "Message stream", placeholder: "outbound", help: "Defaults to outbound for transactional messages." },
    ],
  },
  {
    value: "sendgrid",
    label: "SendGrid",
    description: "Widely supported transactional email API with sender authentication and webhooks.",
    fields: [
      { name: "apiKey", label: "SendGrid API key", type: "password", placeholder: "SG.…", help: "Use a restricted key with Mail Send permission.", secret: true },
      { name: "fromEmail", label: "From address", type: "text", placeholder: "Webinars <hello@example.com>", help: "Use a verified sender identity or authenticated domain." },
      { name: "replyTo", label: "Reply-to address", type: "email", placeholder: "support@example.com", help: "Optional address for attendee replies.", required: false },
    ],
  },
];

export const streamingProviderByValue = new Map(streamingProviders.map((provider) => [provider.value, provider]));
export const emailProviderByValue = new Map(emailProviders.map((provider) => [provider.value, provider]));
