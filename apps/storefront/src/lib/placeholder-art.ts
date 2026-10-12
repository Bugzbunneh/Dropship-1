import type { PlaceholderSpec } from "@dropship/stores";

// Illustrations for demo products, drawn as SVG from a product's department, category and title.
// They stand in for photographs until real product images arrive with supplier import (Phase 3).
// Colours come from the department, so dog products are amber and cat products are teal.

export type ArtColours = {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  emphasis: string;
};

export type IconKind =
  "paw" | "bone" | "ball" | "bowl" | "bed" | "fish" | "brush" | "post" | "tray" | "lead";

const SIZE = 800;
const MAX_TITLE_LINE = 24;
const MAX_TITLE_LINES = 2;

export const escapeXml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

// Which picture suits a collection. Checked in order, first match wins.
const ICON_RULES: [RegExp, IconKind | "treat"][] = [
  [/bed|hideaway|perch/, "bed"],
  [/scratch|tree/, "post"],
  [/litter/, "tray"],
  [/groom/, "brush"],
  [/feed|bowl|fountain/, "bowl"],
  [/walk|travel|lead|harness/, "lead"],
  [/toy|play/, "ball"],
  [/treat|chew|food/, "treat"],
];

export const iconKindFor = (category: string, department: string): IconKind => {
  for (const [pattern, kind] of ICON_RULES) {
    if (pattern.test(category)) {
      // treats are bones for dogs and fish for cats
      return kind === "treat" ? (department === "cats" ? "fish" : "bone") : kind;
    }
  }
  return "paw";
};

// Greedy word wrap into at most two lines, with an ellipsis if the title is longer.
export const wrapTitle = (title: string): string[] => {
  const lines: string[] = [];
  let current = "";
  for (const word of title.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= MAX_TITLE_LINE || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  if (lines.length <= MAX_TITLE_LINES) {
    return lines;
  }
  const kept = lines.slice(0, MAX_TITLE_LINES);
  const last = kept[MAX_TITLE_LINES - 1] ?? "";
  kept[MAX_TITLE_LINES - 1] = `${last.slice(0, MAX_TITLE_LINE - 1).trimEnd()}…`;
  return kept;
};

// Each icon is drawn inside a 400 by 400 box.
const iconSvg = (kind: IconKind, colours: ArtColours): string => {
  const ink = colours.emphasis;
  const soft = colours.accent;
  const light = colours.background;

  switch (kind) {
    case "bone":
      return `<g fill="${ink}"><rect x="90" y="172" width="220" height="56" rx="28"/><circle cx="92" cy="168" r="42"/><circle cx="92" cy="232" r="42"/><circle cx="308" cy="168" r="42"/><circle cx="308" cy="232" r="42"/></g><rect x="130" y="186" width="140" height="10" rx="5" fill="${light}" opacity=".35"/>`;
    case "ball":
      return `<circle cx="200" cy="200" r="130" fill="${ink}"/><path d="M90 150 C150 190 150 250 100 300" fill="none" stroke="${light}" stroke-width="16" stroke-linecap="round" opacity=".55"/><path d="M310 150 C250 190 250 250 300 300" fill="none" stroke="${light}" stroke-width="16" stroke-linecap="round" opacity=".55"/><circle cx="150" cy="140" r="26" fill="${light}" opacity=".3"/>`;
    case "bowl":
      return `<ellipse cx="200" cy="170" rx="140" ry="36" fill="${soft}"/><path d="M60 170 C60 290 130 340 200 340 C270 340 340 290 340 170 Z" fill="${ink}"/><ellipse cx="200" cy="170" rx="118" ry="24" fill="${light}" opacity=".25"/><circle cx="160" cy="165" r="14" fill="${soft}"/><circle cx="205" cy="158" r="14" fill="${soft}"/><circle cx="245" cy="168" r="14" fill="${soft}"/>`;
    case "bed":
      return `<rect x="40" y="200" width="320" height="120" rx="60" fill="${ink}"/><rect x="70" y="150" width="260" height="100" rx="50" fill="${soft}"/><rect x="95" y="170" width="210" height="14" rx="7" fill="${light}" opacity=".5"/><circle cx="285" cy="250" r="9" fill="${light}" opacity=".5"/>`;
    case "fish":
      return `<path d="M60 200 C110 110 230 110 290 200 C230 290 110 290 60 200 Z" fill="${ink}"/><path d="M285 200 L360 140 L345 200 L360 260 Z" fill="${ink}"/><circle cx="130" cy="185" r="14" fill="${light}"/><circle cx="130" cy="185" r="6" fill="${ink}"/><path d="M180 130 C190 170 190 230 180 270" fill="none" stroke="${light}" stroke-width="10" opacity=".4"/>`;
    case "brush":
      return `<rect x="105" y="90" width="190" height="90" rx="30" fill="${ink}"/><rect x="170" y="170" width="60" height="150" rx="30" fill="${soft}"/><g stroke="${light}" stroke-width="10" stroke-linecap="round" opacity=".6"><path d="M140 112 v46"/><path d="M170 112 v46"/><path d="M200 112 v46"/><path d="M230 112 v46"/><path d="M260 112 v46"/></g>`;
    case "post":
      return `<rect x="90" y="305" width="220" height="40" rx="14" fill="${soft}"/><rect x="170" y="90" width="60" height="230" rx="14" fill="${ink}"/><g stroke="${light}" stroke-width="8" opacity=".4"><path d="M170 130 h60"/><path d="M170 170 h60"/><path d="M170 210 h60"/><path d="M170 250 h60"/><path d="M170 290 h60"/></g><circle cx="200" cy="80" r="46" fill="${soft}"/>`;
    case "tray":
      return `<path d="M50 200 H350 L320 320 H80 Z" fill="${ink}"/><rect x="40" y="170" width="320" height="44" rx="22" fill="${soft}"/><g fill="${light}" opacity=".45"><circle cx="140" cy="260" r="12"/><circle cx="205" cy="280" r="12"/><circle cx="262" cy="255" r="12"/></g>`;
    case "lead":
      return `<ellipse cx="105" cy="170" rx="58" ry="78" fill="none" stroke="${ink}" stroke-width="28"/><path d="M150 232 C210 300 260 230 300 270 C320 290 322 312 316 330" fill="none" stroke="${ink}" stroke-width="26" stroke-linecap="round"/><rect x="286" y="322" width="64" height="40" rx="14" fill="${soft}"/><circle cx="318" cy="342" r="9" fill="${light}" opacity=".7"/>`;
    case "paw":
      return `<g fill="${ink}"><ellipse cx="200" cy="262" rx="82" ry="64"/><ellipse cx="96" cy="190" rx="32" ry="44" transform="rotate(-20 96 190)"/><ellipse cx="158" cy="118" rx="32" ry="46" transform="rotate(-8 158 118)"/><ellipse cx="242" cy="118" rx="32" ry="46" transform="rotate(8 242 118)"/><ellipse cx="304" cy="190" rx="32" ry="44" transform="rotate(20 304 190)"/></g>`;
  }
};

// Faint paw prints scattered behind the picture; their positions change with the image number.
const watermark = (colours: ArtColours, index: number): string => {
  const spots: [number, number, number][] = [
    [110, 120, 0.7],
    [690, 150, 0.9],
    [650, 650, 0.6],
    [120, 640, 0.8],
  ];
  const shift = (index - 1) * 55;
  const prints = spots.map(([x, y, scale]) => {
    const px = x + (index % 2 === 0 ? shift : -shift) * 0.4;
    return `<g transform="translate(${px} ${y}) scale(${scale * 0.16}) translate(-200 -200)" fill="${colours.primary}" opacity=".22">${iconSvg("paw", colours).replace(/fill="[^"]*"/g, "")}</g>`;
  });
  return prints.join("");
};

export const renderPlaceholderSvg = (spec: PlaceholderSpec, colours: ArtColours): string => {
  const kind = iconKindFor(spec.category, spec.department);
  const lines = wrapTitle(spec.title);
  const rotation = ((spec.index - 1) * 35) % 180;
  const scale = [1, 1.1, 0.88, 1.05, 0.95, 1][spec.index - 1] ?? 1;
  const iconX = SIZE / 2 - 200 * scale;
  const iconY = 150 - (scale - 1) * 120;

  const textLines = lines
    .map(
      (line, row) =>
        `<text x="400" y="${674 + row * 38}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="32" font-weight="700" fill="${colours.emphasis}">${escapeXml(line)}</text>`,
    )
    .join("");
  const labelHeight = 40 + lines.length * 38;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" aria-label="${escapeXml(spec.title)}"><defs><linearGradient id="bg" gradientTransform="rotate(${rotation} .5 .5)"><stop offset="0" stop-color="${colours.surface}"/><stop offset="1" stop-color="${colours.primary}" stop-opacity=".38"/></linearGradient></defs><rect width="${SIZE}" height="${SIZE}" fill="${colours.background}"/><rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>${watermark(colours, spec.index)}<circle cx="400" cy="330" r="235" fill="${colours.background}" opacity=".55"/><g transform="translate(${iconX} ${iconY}) scale(${scale})">${iconSvg(kind, colours)}</g><rect x="140" y="${640 - 4}" width="520" height="${labelHeight}" rx="24" fill="${colours.background}" opacity=".92"/>${textLines}</svg>`;
};
