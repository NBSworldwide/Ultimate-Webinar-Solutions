export class RequestSecurityError extends Error {
  constructor(message = "The request origin is not allowed.") {
    super(message);
    this.name = "RequestSecurityError";
  }
}

/**
 * Browser requests normally include Origin or Referer. Validate either when
 * present so cookie-authenticated mutations cannot be replayed cross-site.
 * Header-less requests remain usable for server-to-server clients and local
 * CLI smoke tests; those clients should still authenticate where required.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let candidate: string | null = origin;
  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {
      throw new RequestSecurityError("The request referer is invalid.");
    }
  }
  if (!candidate) return;

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    throw new RequestSecurityError("The request URL is invalid.");
  }
  const allowed = new Set<string>([requestOrigin]);
  if (process.env.APP_URL) {
    try {
      allowed.add(new URL(process.env.APP_URL).origin);
    } catch {
      throw new RequestSecurityError("APP_URL is invalid.");
    }
  }
  if (!allowed.has(candidate)) throw new RequestSecurityError();
}
