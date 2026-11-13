import { describe, expect, it } from "vitest";
import { postCta } from "./post-cta";

describe("postCta", () => {
  it("gives EB-3 posts the EB-3 call to action", () => {
    expect(postCta({ category: "immigration", tags: ["eb3", "green-card"] })).toBe("eb3");
  });

  it("gives other immigration posts the N400 Ready call to action", () => {
    expect(postCta({ category: "immigration", tags: ["green-card"] })).toBe("n400");
  });

  it("shows no immigration call to action on other topics", () => {
    expect(postCta({ category: "tax", tags: [] })).toBeNull();
  });
});
