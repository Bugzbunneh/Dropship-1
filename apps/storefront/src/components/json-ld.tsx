import { serialiseJsonLd, type JsonLd as JsonLdData } from "@/lib/seo/jsonld";

// Structured data for search engines. Safe to embed: the serialiser escapes anything that could
// close the script tag.
export const JsonLd = ({ data }: { data: JsonLdData | JsonLdData[] }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialiseJsonLd(data) }} />
);
