// 🔊 through Web Audio instead of <audio>. On iOS, <audio> playback kills a
// running speech-recognition capture for 20–33 s; Web Audio playback leaves it
// hearing (device probe 2026-09-25, voice-spike strategy=webaudio). Used only
// while an iOS mic session runs: with no session, <audio> stays the player,
// because Web Audio is silenced by the iPhone's mute switch outside a
// record-capable audio session. Spec D15, rev 3.12.

type AudioContextCtor = new () => AudioContext;

export interface WebAudioPlayback {
  stop(): void;
  /** Resolves once playback has started (or was stopped first); rejects if loading fails. */
  started: Promise<void>;
}

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function context(): AudioContext {
  if (!ctx) {
    const g = globalThis as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
    const Ctor = g.AudioContext ?? g.webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio unavailable');
    ctx = new Ctor();
  }
  return ctx;
}

function decoded(src: string): Promise<AudioBuffer> {
  let p = buffers.get(src);
  if (!p) {
    const c = context();
    p = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`audio ${res.status}`);
        return res.arrayBuffer();
      })
      .then((bytes) => c.decodeAudioData(bytes));
    // A failed load is retried on the next play.
    p.catch(() => buffers.delete(src));
    buffers.set(src, p);
  }
  return p;
}

/** Call from the tap handler: iOS only lets the context resume inside a user gesture. */
export function playWebAudio(src: string, onEnded: () => void): WebAudioPlayback {
  const c = context();
  void c.resume();
  let node: AudioBufferSourceNode | null = null;
  let stopped = false;
  const started = decoded(src).then((buffer) => {
    if (stopped) return;
    node = c.createBufferSource();
    node.buffer = buffer;
    node.connect(c.destination);
    node.onended = () => onEnded();
    node.start(0);
  });
  return {
    stop() {
      stopped = true;
      try {
        node?.stop();
      } catch {
        // Already ended.
      }
    },
    started,
  };
}
