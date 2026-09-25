import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Device probe 2026-09-25 (voice-spike mode=audio&strategy=webaudio): on iOS a
// running speech-recognition session survives Web Audio playback, while <audio>
// playback kills its capture for 20–33 s. This module plays 🔊 through Web Audio.

class FakeNode {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  started = 0;
  stopped = 0;
  connect() {}
  start() {
    this.started++;
  }
  stop() {
    this.stopped++;
  }
}

class FakeCtx {
  static last: FakeCtx | null = null;
  resumed = 0;
  decoded = 0;
  nodes: FakeNode[] = [];
  destination = {};
  constructor() {
    FakeCtx.last = this;
  }
  resume() {
    this.resumed++;
    return Promise.resolve();
  }
  decodeAudioData() {
    this.decoded++;
    return Promise.resolve({ duration: 1 });
  }
  createBufferSource() {
    const n = new FakeNode();
    this.nodes.push(n);
    return n;
  }
}

let fetches = 0;
let fetchOk = true;

async function load() {
  vi.resetModules();
  return import('./web-audio-player');
}

beforeEach(() => {
  fetches = 0;
  fetchOk = true;
  FakeCtx.last = null;
  vi.stubGlobal('AudioContext', FakeCtx);
  vi.stubGlobal('fetch', async () => {
    fetches++;
    return { ok: fetchOk, status: fetchOk ? 200 : 404, arrayBuffer: async () => new ArrayBuffer(8) };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('playWebAudio', () => {
  it('plays the decoded buffer and reports the end', async () => {
    const { playWebAudio } = await load();
    let ended = 0;
    const p = playWebAudio('/n400-audio/civic_question/q002.mp3', () => {
      ended++;
    });
    await p.started;
    const node = FakeCtx.last!.nodes[0];
    expect(node.started).toBe(1);
    node.onended?.();
    expect(ended).toBe(1);
  });

  it('decodes each src once', async () => {
    const { playWebAudio } = await load();
    await playWebAudio('/a.mp3', () => {}).started;
    await playWebAudio('/a.mp3', () => {}).started;
    expect(fetches).toBe(1);
    expect(FakeCtx.last!.decoded).toBe(1);
    expect(FakeCtx.last!.nodes).toHaveLength(2);
  });

  it('resumes the context on every play (iOS unlocks audio inside the tap)', async () => {
    const { playWebAudio } = await load();
    await playWebAudio('/a.mp3', () => {}).started;
    await playWebAudio('/a.mp3', () => {}).started;
    expect(FakeCtx.last!.resumed).toBe(2);
  });

  it('stop before the buffer is ready never starts playback', async () => {
    const { playWebAudio } = await load();
    const p = playWebAudio('/a.mp3', () => {});
    p.stop();
    await p.started;
    expect(FakeCtx.last!.nodes).toHaveLength(0);
  });

  it('stop after start stops the node', async () => {
    const { playWebAudio } = await load();
    const p = playWebAudio('/a.mp3', () => {});
    await p.started;
    p.stop();
    expect(FakeCtx.last!.nodes[0].stopped).toBe(1);
  });

  it('a failed fetch rejects and is retried on the next play', async () => {
    const { playWebAudio } = await load();
    fetchOk = false;
    await expect(playWebAudio('/missing.mp3', () => {}).started).rejects.toThrow();
    fetchOk = true;
    await playWebAudio('/missing.mp3', () => {}).started;
    expect(fetches).toBe(2);
  });
});
