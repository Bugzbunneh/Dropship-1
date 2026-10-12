import { describe, expect, it } from "vitest";
import {
  escapeXml,
  iconKindFor,
  renderPlaceholderSvg,
  wrapTitle,
  type ArtColours,
} from "./placeholder-art";

const colours: ArtColours = {
  background: "#FFFBF5",
  surface: "#FFF1D6",
  primary: "#F8B036",
  accent: "#C96F00",
  emphasis: "#8A5300",
};

const spec = { department: "dogs", category: "dog-beds", title: "Cloud Comfort Bed", index: 1 };

describe("renderPlaceholderSvg", () => {
  it("draws a labelled SVG in the department colours", () => {
    const svg = renderPlaceholderSvg(spec, colours);

    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg).toContain('aria-label="Cloud Comfort Bed"');
    expect(svg).toContain("Cloud Comfort Bed</text>");
    expect(svg).toContain("#8A5300");
    expect(svg).toContain("#F8B036");
  });

  it("cannot be used to inject markup through the title", () => {
    const svg = renderPlaceholderSvg(
      { ...spec, title: `</text><script>alert("x")</script> & 'friends'` },
      colours,
    );

    expect(svg).not.toContain("<script");
    expect(svg).toContain("&lt;/text&gt;");
    expect(svg).toContain("&amp;");
  });

  it("varies between a product's images", () => {
    const first = renderPlaceholderSvg({ ...spec, index: 1 }, colours);
    const second = renderPlaceholderSvg({ ...spec, index: 2 }, colours);

    expect(first).not.toBe(second);
  });

  it("is deterministic, so it can be cached forever", () => {
    expect(renderPlaceholderSvg(spec, colours)).toBe(renderPlaceholderSvg(spec, colours));
  });

  it("draws every kind of picture", () => {
    const categories = [
      "dog-beds",
      "dog-toys",
      "dog-walking",
      "dog-feeding",
      "dog-treats",
      "dog-grooming",
      "cat-scratchers",
      "cat-litter",
      "cat-treats",
      "unknown-thing",
    ];

    for (const category of categories) {
      const svg = renderPlaceholderSvg({ ...spec, category }, colours);
      expect(svg.length, category).toBeGreaterThan(500);
      expect(svg.endsWith("</svg>"), category).toBe(true);
    }
  });
});

describe("iconKindFor", () => {
  it("picks a picture to suit the collection", () => {
    expect(iconKindFor("dog-beds", "dogs")).toBe("bed");
    expect(iconKindFor("cat-beds", "cats")).toBe("bed");
    expect(iconKindFor("cat-scratchers", "cats")).toBe("post");
    expect(iconKindFor("cat-litter", "cats")).toBe("tray");
    expect(iconKindFor("dog-grooming", "dogs")).toBe("brush");
    expect(iconKindFor("dog-feeding", "dogs")).toBe("bowl");
    expect(iconKindFor("dog-walking", "dogs")).toBe("lead");
    expect(iconKindFor("dog-toys", "dogs")).toBe("ball");
  });

  it("gives dogs bones and cats fish for treats", () => {
    expect(iconKindFor("dog-treats", "dogs")).toBe("bone");
    expect(iconKindFor("cat-treats", "cats")).toBe("fish");
  });

  it("falls back to a paw", () => {
    expect(iconKindFor("mystery", "dogs")).toBe("paw");
  });
});

describe("wrapTitle", () => {
  it("keeps a short title on one line", () => {
    expect(wrapTitle("Soft Slicker Brush")).toEqual(["Soft Slicker Brush"]);
  });

  it("wraps a longer title onto two lines", () => {
    const lines = wrapTitle("Cloud Comfort Orthopaedic Dog Bed");

    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toBe("Cloud Comfort Orthopaedic Dog Bed");
  });

  it("shortens a title that needs more than two lines", () => {
    const lines = wrapTitle(
      "An Extremely Long Product Name That Just Keeps Going On And On Forever",
    );

    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith("…")).toBe(true);
  });

  it("handles one very long word", () => {
    expect(wrapTitle("Supercalifragilisticexpialidocious").length).toBeGreaterThan(0);
  });
});

describe("escapeXml", () => {
  it("escapes the five XML special characters", () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;",
    );
  });
});
