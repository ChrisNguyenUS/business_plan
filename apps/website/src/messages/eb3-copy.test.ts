import { describe, it, expect } from "vitest";
import en from "./en.json";
import vi from "./vi.json";

// Shape = every key path plus array lengths; values ignored.
function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return [`${path}[len=${value.length}]`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  }
  return [path];
}

describe("eb3 copy", () => {
  it("exists in both locales", () => {
    expect((en as Record<string, unknown>).eb3).toBeDefined();
    expect((vi as Record<string, unknown>).eb3).toBeDefined();
  });

  it("has identical shape in vi and en", () => {
    const e = (en as Record<string, unknown>).eb3;
    const v = (vi as Record<string, unknown>).eb3;
    expect(shape(v).sort()).toEqual(shape(e).sort());
  });

  it("has no empty strings", () => {
    for (const locale of [en, vi]) {
      const flat = JSON.stringify((locale as Record<string, unknown>).eb3);
      expect(flat).not.toContain('""');
    }
  });

  it("never names the partner", () => {
    for (const locale of [en, vi]) {
      expect(JSON.stringify(locale).toLowerCase()).not.toContain("immilink");
    }
  });

  it("never uses the misleading 'lao động tự do' label", () => {
    expect(JSON.stringify(vi).toLowerCase()).not.toContain("lao động tự do");
  });
});
