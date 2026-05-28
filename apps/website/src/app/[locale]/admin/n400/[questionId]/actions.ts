'use server';

// Phase 7 Task 2 — Admin question/answer CRUD + audio upload server actions.
//
// Every action runs `getAdminSupabase()` first which:
//   1. Reads the cookie session (anon key)
//   2. Verifies user.role === 'admin' on `profiles`
//   3. Redirects to /login on failure (no silent denial)
//
// Cache invalidation: Each successful mutation calls
// `revalidateTag('n400-content')`. Public N400 pages are wrapped with
// `unstable_cache(..., ['n400-content'])` already (Phase 1), so a save
// here propagates without a redeploy.
//
// Audio upload uses Supabase Storage signed-upload URLs. Client uploads
// the MP3 directly to Storage; the server then stamps the public URL on
// the corresponding row. Splitting upload from URL-save means a slow
// upload doesn't block the form submit — the client can retry the
// upload independently and only call `saveAudioUrl` once it succeeds.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

async function getAdminSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') redirect('/login');
  return supabase;
}

export async function updateQuestion(
  questionId: number,
  formData: FormData,
): Promise<void> {
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from('n400_questions')
    .update({
      question_en: String(formData.get('question_en') ?? '').trim(),
      question_vi: String(formData.get('question_vi') ?? '').trim(),
      category: String(formData.get('category') ?? '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', questionId);
  if (error) throw new Error(error.message);
  updateTag('n400-content');
}

export async function updateAnswer(
  answerId: string,
  formData: FormData,
): Promise<void> {
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from('n400_answers')
    .update({
      answer_en: String(formData.get('answer_en') ?? '').trim(),
      answer_vi: String(formData.get('answer_vi') ?? '').trim(),
      is_correct: formData.get('is_correct') === 'true',
    })
    .eq('id', answerId);
  if (error) throw new Error(error.message);
  updateTag('n400-content');
}

export async function addAnswer(
  questionId: number,
  formData: FormData,
): Promise<void> {
  const supabase = await getAdminSupabase();
  const { error } = await supabase.from('n400_answers').insert({
    question_id: questionId,
    answer_en: String(formData.get('answer_en') ?? '').trim(),
    answer_vi: String(formData.get('answer_vi') ?? '').trim(),
    is_correct: formData.get('is_correct') === 'true',
    display_order: 999,
  });
  if (error) throw new Error(error.message);
  updateTag('n400-content');
}

export async function deleteAnswer(answerId: string): Promise<void> {
  const supabase = await getAdminSupabase();
  // Soft delete: n400_answers has deleted_at column, but the `n400 answers
  // public read` policy filters on `deleted_at IS NULL`. Setting it makes
  // the row invisible to learners but keeps history for analytics.
  const { error } = await supabase
    .from('n400_answers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', answerId);
  if (error) throw new Error(error.message);
  updateTag('n400-content');
}

// ── Audio upload ──────────────────────────────────────────────────────────
// The `n400-audio` bucket has admin-only ALL policy on storage.objects.
// We grant a one-shot signed upload URL so the browser can PUT the MP3
// directly to Storage. The bucket is public-read, so once the file
// lives there, the public URL is just /storage/v1/object/public/...

export interface SignedUpload {
  signedUrl: string;
  path: string;
  token: string;
  publicUrl: string;
}

export async function getAudioUploadUrl(
  questionId: number,
  type: 'question' | 'answer',
  fileName?: string,
): Promise<SignedUpload | { error: string }> {
  const supabase = await getAdminSupabase();
  const ts = Date.now();
  const safeId = String(questionId).padStart(3, '0');
  const stem = type === 'question' ? `q${safeId}` : `q${safeId}-a-${ts}`;
  const path = type === 'question'
    ? `questions/${stem}-${ts}.mp3`
    : `answers/${stem}.mp3`;
  const { data, error } = await supabase.storage
    .from('n400-audio')
    .createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? 'failed to sign upload URL' };
  const { data: pub } = supabase.storage.from('n400-audio').getPublicUrl(path);
  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
    publicUrl: pub.publicUrl,
  };
  // fileName is reserved for a future "preserve original filename"
  // feature; ignored for now to keep paths predictable.
  void fileName;
}

export async function saveQuestionAudioUrl(
  questionId: number,
  publicUrl: string,
): Promise<{ success?: true; error?: string }> {
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from('n400_questions')
    .update({ question_audio_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', questionId);
  if (error) return { error: error.message };
  updateTag('n400-content');
  return { success: true };
}

export async function saveAnswerAudioUrl(
  answerId: string,
  publicUrl: string,
): Promise<{ success?: true; error?: string }> {
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from('n400_answers')
    .update({ answer_audio_url: publicUrl })
    .eq('id', answerId);
  if (error) return { error: error.message };
  updateTag('n400-content');
  return { success: true };
}
