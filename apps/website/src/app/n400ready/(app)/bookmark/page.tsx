import { redirect } from 'next/navigation';

/**
 * The standalone bookmark page was merged into Flashcards
 * (list view + "Đã đánh dấu" filter). Old links keep working.
 * Spec: docs/superpowers/specs/2026-07-05-flashcards-bookmark-merge-design.md
 */
export default async function BookmarkRedirectPage() {
  redirect(`/n400ready/flashcards?view=list&filter=bookmarks`);
}
