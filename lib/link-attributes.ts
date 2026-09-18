const ALLOWED_CUSTOM_LINK_ATTRIBUTES = /^(?:aria-[a-z0-9:-]+|data-[a-z0-9:_-]+|class|download|id|role|title)$/i;

function cleanAttributeValue(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 500);
}

/**
 * Parse the small, safe subset of custom link attributes exposed by the page
 * builder. The editor accepts one `key|value` pair per line, plus a familiar
 * `key="value"` form for pasted values. Event handlers, style, href, target,
 * and rel are intentionally excluded because those are either unsafe or
 * controlled by the widget's dedicated fields.
 */
export function safeLinkAttributes(value: string | number | undefined): Record<string, string> {
  if (typeof value !== "string") return {};
  const attributes: Record<string, string> = {};
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const pipeIndex = line.indexOf("|");
    let key = "";
    let rawValue = "";
    if (pipeIndex > 0) {
      key = line.slice(0, pipeIndex).trim();
      rawValue = line.slice(pipeIndex + 1).trim();
    } else {
      const match = line.match(/^([A-Za-z][A-Za-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))$/);
      if (!match) continue;
      key = match[1] ?? "";
      rawValue = match[2] ?? match[3] ?? match[4] ?? "";
    }
    if (!ALLOWED_CUSTOM_LINK_ATTRIBUTES.test(key)) continue;
    const cleanedValue = cleanAttributeValue(rawValue);
    if (cleanedValue) attributes[key.toLowerCase()] = cleanedValue;
  }
  return attributes;
}
