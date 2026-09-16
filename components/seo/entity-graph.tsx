import { serializeJsonLd } from "@/lib/seo";

export function EntityGraph({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
