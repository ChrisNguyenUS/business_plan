import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { isAllowedCoverUrl } from "./cover";

describe("isAllowedCoverUrl", () => {
  it("accepts a path on this site", () => {
    expect(isAllowedCoverUrl("/images/blog/thi-quoc-tich-my.webp")).toBe(true);
  });

  it("accepts a public file in the project's Supabase Storage", () => {
    expect(isAllowedCoverUrl("https://ffsrlmtqzlidnuitkdvw.supabase.co/storage/v1/object/public/blog/a.webp")).toBe(true);
  });

  it("rejects hosts next/image is not configured for, and non-https or private files", () => {
    expect(isAllowedCoverUrl("https://example.com/a.jpg")).toBe(false);
    expect(isAllowedCoverUrl("//example.com/a.jpg")).toBe(false);
    expect(isAllowedCoverUrl("http://ffsrlmtqzlidnuitkdvw.supabase.co/storage/v1/object/public/blog/a.webp")).toBe(false);
    expect(isAllowedCoverUrl("https://ffsrlmtqzlidnuitkdvw.supabase.co/storage/v1/object/sign/blog/a.webp")).toBe(false);
    expect(isAllowedCoverUrl("https://other.supabase.co/storage/v1/object/public/blog/a.webp")).toBe(false);
    expect(isAllowedCoverUrl("not a url")).toBe(false);
  });

  it("matches the Storage host in next.config images.remotePatterns", () => {
    const hosts = (nextConfig.images?.remotePatterns ?? [])
      .map((p) => (p instanceof URL ? p.hostname : p.hostname))
      .filter((h) => h.endsWith(".supabase.co"));
    expect(hosts).toHaveLength(1);
    expect(isAllowedCoverUrl(`https://${hosts[0]}/storage/v1/object/public/blog/a.webp`)).toBe(true);
  });
});
