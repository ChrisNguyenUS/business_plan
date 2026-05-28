'use client';

// Phase 7 Task 3b — Admin audio upload widget.
//
// Two-step upload to keep slow PUTs off the form-submit path:
//   1. Client calls `getAudioUploadUrl(questionId, type)` server action
//      → receives signedUrl + path + token + publicUrl.
//   2. Client PUTs the MP3 to signedUrl directly (browser → Supabase
//      Storage; the file never traverses our Next server).
//   3. Client calls `saveQuestionAudioUrl(questionId, publicUrl)` (or
//      `saveAnswerAudioUrl`) to stamp the public URL on the row.
//
// Bucket policy enforces admin-only writes, so unauthenticated browsers
// cannot bypass step 1. Failure modes (signed URL error, upload error,
// save error) surface inline so the operator sees the cause.

import { useState, useTransition } from 'react';
import { Upload, Volume2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getAudioUploadUrl,
  saveQuestionAudioUrl,
  saveAnswerAudioUrl,
} from '@/app/[locale]/admin/n400/[questionId]/actions';

interface AudioUploadButtonProps {
  questionId: number;
  // Question audio (`type='question'`) is keyed only by questionId.
  // Answer audio (`type='answer'`) needs an answerId so we know which
  // n400_answers row to stamp.
  type: 'question' | 'answer';
  answerId?: string;
  currentUrl: string | null;
  // Optional render slot for a "currently playing" preview.
  className?: string;
}

export function AudioUploadButton({
  questionId,
  type,
  answerId,
  currentUrl,
  className = '',
}: AudioUploadButtonProps) {
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [latestUrl, setLatestUrl] = useState<string | null>(currentUrl);

  async function handleFile(file: File) {
    setError(null);
    setStatus('uploading');
    try {
      const signed = await getAudioUploadUrl(questionId, type);
      if ('error' in signed) {
        setStatus('error');
        setError(signed.error);
        return;
      }

      const putRes = await fetch(signed.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'audio/mpeg' },
      });
      if (!putRes.ok) {
        setStatus('error');
        setError(`Upload failed (${putRes.status})`);
        return;
      }

      setStatus('saving');
      const saveRes =
        type === 'question'
          ? await saveQuestionAudioUrl(questionId, signed.publicUrl)
          : answerId
            ? await saveAnswerAudioUrl(answerId, signed.publicUrl)
            : { error: 'missing answerId for answer audio' };
      if ('error' in saveRes && saveRes.error) {
        setStatus('error');
        setError(saveRes.error);
        return;
      }

      setLatestUrl(signed.publicUrl);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'unknown upload error');
    }
  }

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer hover:bg-teal-light transition-colors">
        <Upload className="h-3.5 w-3.5" />
        {latestUrl ? 'Replace audio' : 'Upload audio'}
        <input
          type="file"
          accept="audio/mpeg,.mp3"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) startTransition(() => void handleFile(f));
            e.target.value = '';
          }}
        />
      </label>

      {latestUrl ? (
        <a
          href={latestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          <Volume2 className="h-3 w-3" />
          Preview
        </a>
      ) : null}

      {status === 'uploading' ? (
        <span className="text-xs text-muted-foreground">Uploading…</span>
      ) : null}
      {status === 'saving' ? (
        <span className="text-xs text-muted-foreground">Saving…</span>
      ) : null}
      {status === 'done' ? (
        <span className="text-xs text-green-700 inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Saved
        </span>
      ) : null}
      {status === 'error' && error ? (
        <span className="text-xs text-red-600 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      ) : null}
    </div>
  );
}
