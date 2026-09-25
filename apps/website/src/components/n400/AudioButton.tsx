'use client';

import { useRef, useState } from 'react';
import { Volume2, VolumeX, Turtle } from 'lucide-react';
import { useN400Lang } from '@/lib/n400/i18n/provider';
import { playWebAudio, type WebAudioPlayback } from '@/lib/n400/web-audio-player';

type Props = {
  src: string | null;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  /** Playback rate; modern browsers preserve pitch. Pair with variant="slow". */
  rate?: number;
  /** 'slow' renders a turtle icon for đọc-chậm buttons. */
  variant?: 'default' | 'slow';
  /** Runs right before playback starts (spec D15: lets the mic session know). */
  onBeforePlay?: () => void;
  /** Asked at click time; true → play through Web Audio instead of <audio>. On iOS,
   *  <audio> playback kills a running speech-recognition capture; Web Audio doesn't
   *  (device probe 2026-09-25). Only for normal-rate playback. Spec rev 3.12. */
  preferWebAudio?: () => boolean;
};

/**
 * Renders a small play button. Gracefully handles missing audio (404):
 * the audio element fires onError, we mark unavailable, and the button greys out.
 */
export function AudioButton({
  src,
  label,
  size = 'md',
  className = '',
  rate = 1,
  variant = 'default',
  onBeforePlay,
  preferWebAudio,
}: Props) {
  const { dict } = useN400Lang();
  const effectiveLabel = label ?? dict.flashcards.listen;
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [prevSrc, setPrevSrc] = useState<string | null>(src);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webRef = useRef<WebAudioPlayback | null>(null);

  // Adjust state during render when `src` changes (React-recommended pattern).
  // The actual audio swap happens lazily in onClick — we only reset UI flags here.
  if (src !== prevSrc) {
    setPrevSrc(src);
    setPlaying(false);
    setUnavailable(false);
  }

  if (!src) {
    return null;
  }

  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const icon = size === 'sm' ? 14 : 16;

  return (
    <button
      type="button"
      aria-label={effectiveLabel}
      disabled={unavailable}
      onClick={(e) => {
        e.stopPropagation();
        if (unavailable) return;
        if (playing && webRef.current) {
          webRef.current.stop();
          webRef.current = null;
          setPlaying(false);
          return;
        }
        if (!playing && rate === 1 && preferWebAudio?.()) {
          onBeforePlay?.();
          const playback = playWebAudio(src, () => {
            if (webRef.current === playback) webRef.current = null;
            setPlaying(false);
          });
          webRef.current = playback;
          setPlaying(true);
          playback.started.catch(() => {
            if (webRef.current === playback) webRef.current = null;
            setPlaying(false);
            setUnavailable(true);
          });
          return;
        }
        // If the existing audio object points at a stale src, dispose of it.
        if (audioRef.current && audioRef.current.src && !audioRef.current.src.endsWith(src)) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if (!audioRef.current) {
          const a = new Audio(src);
          a.addEventListener('ended', () => setPlaying(false));
          a.addEventListener('error', () => {
            setUnavailable(true);
            setPlaying(false);
          });
          audioRef.current = a;
        }
        const audio = audioRef.current;
        // Re-apply every click so a slow button stays slow across replays.
        audio.playbackRate = rate;
        if ('preservesPitch' in audio) audio.preservesPitch = true;
        if (playing) {
          audio.pause();
          audio.currentTime = 0;
          setPlaying(false);
          return;
        }
        onBeforePlay?.();
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => setPlaying(true)).catch(() => setUnavailable(true));
        } else {
          setPlaying(true);
        }
      }}
      className={`${dim} rounded-full flex items-center justify-center transition-colors ${
        unavailable
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : playing
            ? 'bg-teal-600 text-white shadow-sm'
            : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
      } ${className}`}
    >
      {unavailable ? (
        <VolumeX size={icon} />
      ) : variant === 'slow' ? (
        <Turtle size={icon} />
      ) : (
        <Volume2 size={icon} />
      )}
    </button>
  );
}
