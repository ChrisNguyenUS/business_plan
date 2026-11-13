import type { LocalizedPost } from "./types";

/**
 * Which call to action closes an immigration post: EB-3 posts point to the
 * EB-3 screening, the rest to N400 Ready. Other topics have none.
 */
export function postCta(post: Pick<LocalizedPost, "category" | "tags">): "eb3" | "n400" | null {
  if (post.category !== "immigration") return null;
  return post.tags.includes("eb3") ? "eb3" : "n400";
}
