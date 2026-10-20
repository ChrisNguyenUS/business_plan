import { describe, expect, it } from "vitest";
import { readingMinutes } from "./reading-time";

describe("readingMinutes", () => {
  it("rounds words at 200 per minute, never below 1", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("một hai ba")).toBe(1);
    expect(readingMinutes(Array(1000).fill("chữ").join(" "))).toBe(5);
    expect(readingMinutes(Array(1150).fill("word").join(" "))).toBe(6);
  });

  it("ignores Markdown link targets and symbols", () => {
    const md = "[USCIS](https://www.uscis.gov/n-400) | --- | **đậm** ## Tiêu đề";
    expect(readingMinutes(md)).toBe(1);
  });
});
