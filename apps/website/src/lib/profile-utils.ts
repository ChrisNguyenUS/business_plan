// ============================================================
// profile-utils.ts — Single source of truth for name rendering
// and avatar URL generation across all Manna applications.
//
// RULES:
// - Display names are NEVER stored in the database.
// - Avatar URLs are NEVER stored in the database.
// - Middle names NEVER appear in normal application UI.
// ============================================================

export interface ProfileNameFields {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  name_suffix: string | null;
  full_name: string | null; // legacy fallback
}

/**
 * Generate display name dynamically. Never stored in the database.
 *
 * Rule 1: preferred_name + last_name → "Chris Nguyen"
 * Rule 2: first_name + last_name    → "Christopher Nguyen"
 * Rule 3: preferred_name or first_name alone → "Madonna"
 * Rule 4: full_name (legacy fallback) → "Christopher Nguyen"
 * Rule 5: nothing → "User"
 */
export function getDisplayName(p: ProfileNameFields): string {
  const primary = p.preferred_name || p.first_name;
  if (primary && p.last_name) return `${primary} ${p.last_name}`;
  if (primary) return primary;
  if (p.full_name) return p.full_name;
  return 'User';
}

/**
 * Short name for compact UI (e.g., greeting, avatar label).
 * Returns preferred_name, or first_name, or first word of full_name.
 */
export function getShortName(p: ProfileNameFields): string {
  if (p.preferred_name) return p.preferred_name;
  if (p.first_name) return p.first_name;
  if (p.full_name) return p.full_name.split(' ')[0];
  return 'User';
}

/**
 * Generate legal full name for document automation.
 * Format: first_name [middle_name] last_name [name_suffix]
 * Middle name is included here — the ONLY context where it appears.
 */
export function getLegalName(p: ProfileNameFields): string {
  const parts = [
    p.first_name,
    p.middle_name,
    p.last_name,
    p.name_suffix,
  ].filter(Boolean);
  return parts.join(' ') || p.full_name || '';
}

/**
 * Generate initials for avatar fallback.
 * Falls back to full_name so legacy users (NULL structured fields)
 * get real initials instead of '?'.
 */
export function getInitials(p: ProfileNameFields): string {
  const first = (p.preferred_name || p.first_name || '')[0] || '';
  const last = (p.last_name || '')[0] || '';
  if (first || last) return (first + last).toUpperCase();
  if (p.full_name) {
    const words = p.full_name.trim().split(/\s+/);
    const a = words[0]?.[0] || '';
    const b = words.length > 1 ? words[words.length - 1][0] || '' : '';
    return (a + b).toUpperCase() || '?';
  }
  return '?';
}

/**
 * Generate a public avatar URL from a relative storage path.
 * This is the ONLY place that knows about the storage backend.
 *
 * Returns null if avatar_path is null (caller renders initials fallback).
 *
 * `version` (pass profile.updated_at) is appended as a cache-buster —
 * the public bucket is CDN-cached by URL, so replacing the image at
 * the same path would otherwise serve a stale avatar.
 *
 * Future: swap implementation to Cloudflare R2, S3, etc.
 * without any application-wide code changes.
 */
export function getAvatarUrl(
  avatarPath: string | null,
  version?: string | null,
): string | null {
  if (!avatarPath) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const v = version ? `?v=${encodeURIComponent(version)}` : '';
  return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarPath}${v}`;
}
