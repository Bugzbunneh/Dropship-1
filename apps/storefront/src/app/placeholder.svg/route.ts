import { parsePlaceholderParams } from "@dropship/stores";
import { renderPlaceholderSvg, type ArtColours } from "@/lib/placeholder-art";
import { getStoreConfig } from "@/lib/store";
import { findDepartment } from "@/lib/theme";

// Illustrated stand-ins for product photos on the demo catalog: /placeholder.svg?d=dogs&c=dog-beds
// &t=Title&n=1. The picture depends only on the query string, so it is cached for a year.
export const GET = async (request: Request): Promise<Response> => {
  const spec = parsePlaceholderParams(new URL(request.url).searchParams);
  if (!spec) {
    return new Response("Invalid placeholder request", { status: 400 });
  }

  const config = await getStoreConfig();
  const department = findDepartment(config.departments, spec.department);
  const base = config.theme.colours;
  const colours: ArtColours = {
    background: base.background,
    surface: department?.colours.surface ?? base.surface,
    primary: department?.colours.primary ?? base.accent,
    accent: department?.colours.accent ?? base.accent,
    emphasis: department?.colours.emphasis ?? base.emphasis,
  };

  return new Response(renderPlaceholderSvg(spec, colours), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      // an SVG opened directly must not be able to run script
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
