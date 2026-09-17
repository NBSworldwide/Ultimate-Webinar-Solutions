const allowedTags = new Set([
  "a", "article", "aside", "blockquote", "br", "code", "del", "div", "em", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "iframe", "img", "li", "mark", "ol", "p", "pre",
  "s", "section", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
]);

const voidTags = new Set(["br", "hr", "img"]);
const dangerousContainers = /<\s*(script|style|template|object|embed|form|textarea|select|button|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const allowedIframeHosts = new Set(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com", "player.vimeo.com"]);

function escapeText(value: string): string {
  return value.replace(/&(?!#(?:x[0-9a-f]+|\d+);|[a-z][a-z0-9]+;)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeUrl(value: string, resource: "link" | "media" | "frame"): string | null {
  const candidate = value.trim();
  if (!candidate || /[\r\n]/.test(candidate) || /^(?:javascript|data|vbscript):/i.test(candidate)) return null;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    if (resource === "link" && ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return url.toString();
    if (resource !== "link" && url.protocol === "https:") {
      if (resource === "frame" && !allowedIframeHosts.has(url.hostname.toLowerCase())) return null;
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function safeStyle(value: string): string {
  const declarations: string[] = [];
  const allowedProperties = new Set(["background-color", "color", "font-size", "font-weight", "line-height", "text-align", "text-decoration"]);
  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const propertyValue = declaration.slice(separator + 1).trim();
    if (!allowedProperties.has(property)) continue;
    const valid = property === "color" || property === "background-color"
      ? /^(?:#[0-9a-f]{3,8}|transparent|currentcolor|(?:black|white|red|green|blue|orange|purple|teal))$/i.test(propertyValue)
      : property === "font-size"
        ? /^\d{1,3}(?:\.\d+)?(?:px|rem|em|%)$/.test(propertyValue)
        : property === "font-weight"
          ? /^(?:normal|bold|[1-9]00)$/.test(propertyValue)
          : property === "line-height"
            ? /^(?:normal|\d(?:\.\d+)?(?:px|rem|em|%)?)$/.test(propertyValue)
            : property === "text-align"
              ? /^(?:left|center|right|justify)$/.test(propertyValue)
              : /^(?:none|underline|line-through)$/.test(propertyValue);
    if (valid) declarations.push(`${property}:${propertyValue}`);
  }
  return declarations.join(";");
}

function parseAttributes(source: string, tagName: string): string {
  const attributes: string[] = [];
  const attributePattern = /([A-Za-z_:][A-Za-z0-9:_.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attributePattern.exec(source))) {
    const name = match[1].toLowerCase();
    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
    if (name === "style" && ["blockquote", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "li", "mark", "p", "section", "small", "span", "strong", "u"].includes(tagName)) {
      const style = safeStyle(rawValue);
      if (style) attributes.push(`style="${escapeAttribute(style)}"`);
      continue;
    }
    if (name === "class" || name === "id" || name === "title" || name === "aria-label") {
      attributes.push(`${name}="${escapeAttribute(rawValue.slice(0, 300))}"`);
      continue;
    }
    if (tagName === "a" && ["href", "target", "rel"].includes(name)) {
      if (name === "href") {
        const href = safeUrl(rawValue, "link");
        if (href) attributes.push(`href="${escapeAttribute(href)}"`);
      } else if (name === "target" && rawValue === "_blank") {
        attributes.push("target=\"_blank\"");
      } else if (name === "rel") {
        attributes.push(`rel="${escapeAttribute(rawValue.replace(/[^A-Za-z\s-]/g, "").slice(0, 100))}"`);
      }
      continue;
    }
    if (tagName === "img" && ["src", "alt", "width", "height", "loading"].includes(name)) {
      if (name === "src") {
        const src = safeUrl(rawValue, "media");
        if (src) attributes.push(`src="${escapeAttribute(src)}"`);
      } else if (["width", "height"].includes(name) && /^\d{1,4}$/.test(rawValue)) {
        attributes.push(`${name}="${rawValue}"`);
      } else if (name === "loading" && ["lazy", "eager"].includes(rawValue)) {
        attributes.push(`loading="${rawValue}"`);
      } else if (name === "alt") {
        attributes.push(`alt="${escapeAttribute(rawValue.slice(0, 300))}"`);
      }
      continue;
    }
    if (tagName === "iframe" && ["src", "title", "allow", "allowfullscreen", "loading"].includes(name)) {
      if (name === "src") {
        const src = safeUrl(rawValue, "frame");
        if (src) attributes.push(`src="${escapeAttribute(src)}"`);
      } else if (name === "allowfullscreen") {
        attributes.push("allowfullscreen");
      } else if (name === "loading" && ["lazy", "eager"].includes(rawValue)) {
        attributes.push(`loading="${rawValue}"`);
      } else {
        attributes.push(`${name}="${escapeAttribute(rawValue.slice(0, 300))}"`);
      }
    }
  }
  if (tagName === "a" && attributes.some((attribute) => attribute.startsWith('target="_blank"')) && !attributes.some((attribute) => attribute.startsWith("rel="))) attributes.push('rel="noopener noreferrer"');
  if (tagName === "iframe") {
    if (!attributes.some((attribute) => attribute.startsWith("src="))) return "";
    attributes.push('sandbox="allow-scripts allow-same-origin allow-presentation"');
    if (!attributes.some((attribute) => attribute.startsWith("loading="))) attributes.push('loading="lazy"');
  }
  return attributes.length ? ` ${attributes.join(" ")}` : "";
}

/**
 * Keep the page-builder HTML block useful for semantic snippets while
 * removing scripts, event handlers, unsafe URLs, forms, and untrusted embeds.
 * This function is intentionally dependency-free so it can run during both
 * server rendering and the client-side page preview.
 */
export function sanitizeHtml(value: string): string {
  const source = value.replace(dangerousContainers, "").replace(/<!doctype[^>]*>/gi, "");
  const tagPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g;
  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source))) {
    result += escapeText(source.slice(cursor, match.index));
    const token = match[0];
    cursor = match.index + token.length;
    if (token.startsWith("<!--")) continue;
    const closing = /^<\s*\//.test(token);
    const tagMatch = token.match(/^<\s*\/?\s*([A-Za-z0-9]+)\b/);
    if (!tagMatch) continue;
    const tagName = tagMatch[1].toLowerCase();
    if (!allowedTags.has(tagName)) continue;
    if (closing) {
      if (!voidTags.has(tagName)) result += `</${tagName}>`;
      continue;
    }
    const selfClosing = /\/\s*>$/.test(token) || voidTags.has(tagName);
    const attributes = parseAttributes(token.slice(tagMatch[0].length, -1), tagName);
    if (tagName === "iframe" && !attributes) continue;
    result += `<${tagName}${attributes}${selfClosing ? " /" : ""}>`;
  }
  result += escapeText(source.slice(cursor));
  return result.slice(0, 12000);
}
