import { describe, expect, it } from "vitest";
import { pageWindow } from "./pagination";

describe("pageWindow", () => {
  it("shows every page when there are only a few", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(2, 2)).toEqual([1, 2]);
  });

  it("shows a single page as one number", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
  });

  it("marks skipped ranges with a gap", () => {
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("does not put a gap where the window touches the ends", () => {
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, "gap", 20]);
    expect(pageWindow(19, 20)).toEqual([1, "gap", 18, 19, 20]);
    expect(pageWindow(1, 20)).toEqual([1, 2, "gap", 20]);
  });
});
