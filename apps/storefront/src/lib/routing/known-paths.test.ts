import { describe, expect, it } from "vitest";
import { isKnownPath, STATIC_PATHS, type RouteKnowledge } from "./known-paths";

const knowledge: RouteKnowledge = {
  departments: ["dogs", "cats"],
  collections: [
    { department: "dogs", slug: "dog-beds" },
    { department: "cats", slug: "cat-beds" },
  ],
  productSlugs: ["cloud-comfort-orthopaedic-dog-bed", "feather-wand-teaser"],
};

describe("isKnownPath", () => {
  it("knows every fixed page, with or without a trailing slash", () => {
    for (const path of STATIC_PATHS) {
      expect(isKnownPath(path, knowledge), path).toBe(true);
    }
    expect(isKnownPath("/delivery/", knowledge)).toBe(true);
  });

  it("knows each pet, its everything page and its collections", () => {
    expect(isKnownPath("/dogs", knowledge)).toBe(true);
    expect(isKnownPath("/dogs/all", knowledge)).toBe(true);
    expect(isKnownPath("/dogs/dog-beds", knowledge)).toBe(true);
    expect(isKnownPath("/cats/cat-beds", knowledge)).toBe(true);
  });

  it("does not let one pet borrow another's collection", () => {
    expect(isKnownPath("/dogs/cat-beds", knowledge)).toBe(false);
    expect(isKnownPath("/cats/dog-beds", knowledge)).toBe(false);
  });

  it("knows products by slug", () => {
    expect(isKnownPath("/products/feather-wand-teaser", knowledge)).toBe(true);
    expect(isKnownPath("/products/not-a-product", knowledge)).toBe(false);
    expect(isKnownPath("/products", knowledge)).toBe(false);
  });

  it("rejects unknown pets, paths that are too deep, and nonsense", () => {
    expect(isKnownPath("/birds", knowledge)).toBe(false);
    expect(isKnownPath("/dogs/dog-beds/extra", knowledge)).toBe(false);
    expect(isKnownPath("/products/feather-wand-teaser/extra", knowledge)).toBe(false);
    expect(isKnownPath("/anything/at/all", knowledge)).toBe(false);
    expect(isKnownPath("/%E0%A4%A", knowledge)).toBe(false);
  });

  it("is case sensitive, like the pages themselves", () => {
    expect(isKnownPath("/Dogs", knowledge)).toBe(false);
  });

  it("copes with percent-encoded slugs", () => {
    expect(isKnownPath("/dogs/dog%2Dbeds", knowledge)).toBe(true);
  });
});
