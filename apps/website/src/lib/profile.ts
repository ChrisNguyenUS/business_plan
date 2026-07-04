import { supabase } from '@/lib/supabase';

// Profile service — the only module that writes to the shared profiles
// table from the website. Updates NEVER touch full_name (legacy, written
// only by the signup trigger) and NEVER touch role.

export interface ProfileFieldsUpdate {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  name_suffix?: string | null;
  preferred_language?: 'en' | 'vi';
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function updateProfile(
  userId: string,
  update: ProfileFieldsUpdate
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(update).eq('id', userId);
  return { error: error?.message ?? null };
}

/**
 * Upload (or replace) the user's avatar and point avatar_path at it.
 * Uses upsert so first upload and replacement share one code path.
 * Old files with a different extension are removed so the folder only
 * ever holds the current avatar.
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ avatarPath: string | null; error: string | null }> {
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return { avatarPath: null, error: 'Unsupported image format. Use JPG, PNG, WebP, or GIF.' };
  }

  const avatarPath = `${userId}/avatar.${ext}`;
  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(avatarPath, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      return { avatarPath: null, error: uploadError.message };
    }

    const { data: existing } = await supabase.storage.from('avatars').list(userId);
    const stale = (existing ?? [])
      .filter((f) => f.name !== `avatar.${ext}`)
      .map((f) => `${userId}/${f.name}`);
    if (stale.length > 0) {
      await supabase.storage.from('avatars').remove(stale);
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_path: avatarPath })
      .eq('id', userId);
    if (updateError) {
      return { avatarPath: null, error: updateError.message };
    }

    return { avatarPath, error: null };
  } catch (err) {
    return {
      avatarPath: null,
      error: err instanceof Error ? err.message : 'Upload failed',
    };
  }
}

/** Providers linked to the current auth user (e.g. ['email', 'google']). */
export async function getLinkedProviders(): Promise<string[]> {
  const { data } = await supabase.auth.getUser();
  return data.user?.identities?.map((i) => i.provider) ?? [];
}
