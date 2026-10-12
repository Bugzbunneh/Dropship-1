import { NextResponse, type NextRequest } from "next/server";
import { verdictForPath } from "@/lib/routing/known-store";

// Answers URLs that match no real page with a genuine 404 status, before any page is rendered.
// Without this, a missing product or category is only discovered while the page is streaming, after
// "200 OK" has gone out (a soft 404). It also stops crawlers requesting made-up URLs from filling
// the page cache. If the catalog can't be read, requests pass through untouched.
export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  const verdict = await verdictForPath(request.nextUrl.pathname);

  if (verdict === "unknown") {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
  return NextResponse.next();
};

export const config = {
  // pages only: not Next.js internals, the API, or files with an extension (images, sitemap, robots)
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
