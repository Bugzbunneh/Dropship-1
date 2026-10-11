import { describe, expect, it } from "vitest";
import { collectionTag, parseTagList, probeTag, productTag, storeTag } from "./tags";

describe("tag builders", () => {
  it("build kind:id tags", () => {
    expect(storeTag("abc")).toBe("store:abc");
    expect(productTag("p-1")).toBe("product:p-1");
    expect(collectionTag("c_9")).toBe("collection:c_9");
  });

  it("produce tags the parser accepts", () => {
    const tags = [storeTag("s1"), productTag("p1"), collectionTag("c1"), probeTag];

    const result = parseTagList({ tags });

    expect(result).toEqual({ ok: true, tags });
  });
});

describe("parseTagList", () => {
  it("removes duplicates", () => {
    const result = parseTagList({ tags: ["product:1", "product:1", "product:2"] });

    expect(result).toEqual({ ok: true, tags: ["product:1", "product:2"] });
  });

  it("rejects bodies that are not { tags: [...] }", () => {
    expect(parseTagList(null).ok).toBe(false);
    expect(parseTagList("product:1").ok).toBe(false);
    expect(parseTagList({}).ok).toBe(false);
    expect(parseTagList({ tags: "product:1" }).ok).toBe(false);
    expect(parseTagList({ tags: [] }).ok).toBe(false);
  });

  it("rejects malformed tags", () => {
    expect(parseTagList({ tags: ["product"] }).ok).toBe(false);
    expect(parseTagList({ tags: ["Product:1"] }).ok).toBe(false);
    expect(parseTagList({ tags: ["product:1 2"] }).ok).toBe(false);
    expect(parseTagList({ tags: ["product:1", 7] }).ok).toBe(false);
  });

  it("rejects tags Next.js would silently ignore for being too long", () => {
    const longTag = `product:${"x".repeat(300)}`;

    expect(parseTagList({ tags: [longTag] }).ok).toBe(false);
  });

  it("caps the number of tags per request", () => {
    const tags = Array.from({ length: 101 }, (_, index) => `product:${index}`);

    expect(parseTagList({ tags }).ok).toBe(false);
  });
});
