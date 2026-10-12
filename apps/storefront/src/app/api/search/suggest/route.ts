import { connection } from "next/server";
import { getSnapshot } from "@/lib/catalog";
import { suggestProducts } from "@/lib/catalog/queries";

const MAX_SUGGESTIONS = 6;
const MAX_QUERY_LENGTH = 80;

// Powers the search box's suggestions: GET /api/search/suggest?q=bed returns a few matching
// products. Small on purpose, since it runs as someone types.
export const GET = async (request: Request): Promise<Response> => {
  await connection();
  const text = (new URL(request.url).searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);

  const snapshot = await getSnapshot();
  const cards = suggestProducts(snapshot, text, MAX_SUGGESTIONS);

  const suggestions = cards.map((card) => ({
    slug: card.slug,
    title: card.title,
    brand: card.brand,
    department: card.department,
    imagePath: card.image?.path ?? null,
    imageAlt: card.image?.alt ?? "",
    priceFromMinor: card.priceFromMinor,
  }));

  return Response.json(suggestions, { headers: { "Cache-Control": "private, max-age=60" } });
};
