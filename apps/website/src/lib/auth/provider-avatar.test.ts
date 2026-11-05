import { describe, expect, it } from "vitest";
import { MAX_AVATAR_BYTES, fetchProviderAvatar, isAllowedAvatarUrl } from "./provider-avatar";

const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocK123=s96-c";
const FACEBOOK = "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1&height=100";

type Call = { url: string; init?: RequestInit };

// Fake network: each URL maps to the Response it should get. Records every call
// so a test can prove a URL was never requested.
function fakeFetch(routes: Record<string, () => Response>) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch: ${url}`);
    return route();
  }) as typeof fetch;
  return { impl, calls };
}

const png = (bytes = 10, headers: Record<string, string> = {}) =>
  new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": "image/png", ...headers } });

describe("isAllowedAvatarUrl", () => {
  it("accepts https Google and Facebook avatar URLs", () => {
    expect(isAllowedAvatarUrl(GOOGLE)).toBe(true);
    expect(isAllowedAvatarUrl(FACEBOOK)).toBe(true);
    expect(isAllowedAvatarUrl("https://scontent-iad3-1.xx.fbcdn.net/v/t1.30497-1/p100x100/x.jpg")).toBe(true);
  });

  it("rejects plain http", () => {
    expect(isAllowedAvatarUrl("http://lh3.googleusercontent.com/a/x")).toBe(false);
  });

  it("rejects internal and private targets", () => {
    expect(isAllowedAvatarUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedAvatarUrl("https://localhost/x.png")).toBe(false);
    expect(isAllowedAvatarUrl("https://127.0.0.1:9001/2018-06-01/runtime/invocation/next")).toBe(false);
  });

  it("rejects look-alike hosts", () => {
    expect(isAllowedAvatarUrl("https://lh3.googleusercontent.com.evil.example/x.png")).toBe(false);
    expect(isAllowedAvatarUrl("https://evilgoogleusercontent.com/x.png")).toBe(false);
    expect(isAllowedAvatarUrl("https://googleusercontent.com.attacker.net/x.png")).toBe(false);
  });

  it("rejects credentials, odd ports, data URLs and junk", () => {
    expect(isAllowedAvatarUrl("https://user:pw@lh3.googleusercontent.com/a/x")).toBe(false);
    expect(isAllowedAvatarUrl("https://lh3.googleusercontent.com:8443/a/x")).toBe(false);
    expect(isAllowedAvatarUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isAllowedAvatarUrl("not a url")).toBe(false);
  });
});

describe("fetchProviderAvatar", () => {
  it("downloads an image from an allowed host", async () => {
    const { impl } = fakeFetch({ [GOOGLE]: () => png(10) });
    const avatar = await fetchProviderAvatar(GOOGLE, impl);
    expect(avatar).not.toBeNull();
    expect(avatar!.contentType).toBe("image/png");
    expect(avatar!.ext).toBe("png");
    expect(avatar!.bytes.byteLength).toBe(10);
  });

  it("never requests a URL outside the allowlist", async () => {
    const { impl, calls } = fakeFetch({});
    expect(await fetchProviderAvatar("http://169.254.169.254/latest/meta-data/", impl)).toBeNull();
    expect(await fetchProviderAvatar(123, impl)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("asks fetch not to follow redirects and to time out", async () => {
    const { impl, calls } = fakeFetch({ [GOOGLE]: () => png() });
    await fetchProviderAvatar(GOOGLE, impl);
    expect(calls[0].init?.redirect).toBe("manual");
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("follows a redirect that stays on an allowed host", async () => {
    const cdn = "https://scontent-iad3-1.xx.fbcdn.net/v/p100x100/x.jpg";
    const { impl, calls } = fakeFetch({
      [FACEBOOK]: () => new Response(null, { status: 302, headers: { location: cdn } }),
      [cdn]: () => new Response(new Uint8Array(5), { status: 200, headers: { "content-type": "image/jpeg" } }),
    });
    const avatar = await fetchProviderAvatar(FACEBOOK, impl);
    expect(avatar?.ext).toBe("jpg");
    expect(calls.map((c) => c.url)).toEqual([FACEBOOK, cdn]);
  });

  it("refuses a redirect to a host outside the allowlist", async () => {
    const { impl, calls } = fakeFetch({
      [GOOGLE]: () => new Response(null, { status: 302, headers: { location: "http://10.0.0.5/admin" } }),
    });
    expect(await fetchProviderAvatar(GOOGLE, impl)).toBeNull();
    expect(calls.map((c) => c.url)).toEqual([GOOGLE]);
  });

  it("rejects responses that are not one of the four image types", async () => {
    const { impl } = fakeFetch({
      [GOOGLE]: () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }),
    });
    expect(await fetchProviderAvatar(GOOGLE, impl)).toBeNull();
  });

  it("rejects a declared size above the limit without reading the body", async () => {
    const res = new Response(new Uint8Array(10), {
      status: 200,
      headers: { "content-type": "image/png", "content-length": String(MAX_AVATAR_BYTES + 1) },
    });
    const { impl } = fakeFetch({ [GOOGLE]: () => res });
    expect(await fetchProviderAvatar(GOOGLE, impl)).toBeNull();
    expect(res.bodyUsed).toBe(false);
  });

  it("rejects an empty or oversized body", async () => {
    const empty = fakeFetch({ [GOOGLE]: () => png(0) });
    expect(await fetchProviderAvatar(GOOGLE, empty.impl)).toBeNull();
    const big = fakeFetch({ [GOOGLE]: () => png(MAX_AVATAR_BYTES + 1) });
    expect(await fetchProviderAvatar(GOOGLE, big.impl)).toBeNull();
  });
});
