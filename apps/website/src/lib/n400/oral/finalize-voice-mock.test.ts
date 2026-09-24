import { describe, expect, it } from 'vitest';
import { runVoiceFinalize, type VoiceFinalizeDeps, type VoiceFinalizeRpcArgs } from './finalize-voice-mock';

const ATTEMPT = '00000000-0000-4000-8000-000000000001';
const manifest = [
  { qid: 2, correct: 'A' as const },
  { qid: 23, correct: 'B' as const },
];

function deps(over: Partial<VoiceFinalizeDeps> = {}) {
  const calls: VoiceFinalizeRpcArgs[] = [];
  const d: VoiceFinalizeDeps = {
    userId: 'u1',
    loadAttempt: async () => ({ user_id: 'u1', mode: 'mock_test', slide_manifest: manifest }),
    loadLocation: async () => ({ state_code: 'TX', district_number: null }),
    finalizeRpc: async (args) => {
      calls.push(args);
      return { score: 1, total: 2 };
    },
    ...over,
  };
  return { d, calls };
}

const answers = [
  { qid: 2, transcript: 'the constitution', retried: false, input: 'mic' },
  { qid: 23, transcript: 'Cruz', retried: true, input: 'mic' },
];

describe('runVoiceFinalize (spec §6 steps 1–4)', () => {
  it('rejects a signed-out caller', async () => {
    const { d, calls } = deps({ userId: null });
    await expect(runVoiceFinalize(d, ATTEMPT, answers)).rejects.toThrow('unauthorized');
    expect(calls).toHaveLength(0);
  });

  it("rejects another user's attempt and never calls the RPC", async () => {
    const { d, calls } = deps({ loadAttempt: async () => ({ user_id: 'u2', mode: 'mock_test', slide_manifest: manifest }) });
    await expect(runVoiceFinalize(d, ATTEMPT, answers)).rejects.toThrow('unauthorized');
    expect(calls).toHaveLength(0);
  });

  it('rejects a missing or non-mock attempt and a malformed id', async () => {
    await expect(runVoiceFinalize(deps({ loadAttempt: async () => null }).d, ATTEMPT, answers)).rejects.toThrow('unauthorized');
    await expect(
      runVoiceFinalize(deps({ loadAttempt: async () => ({ user_id: 'u1', mode: 'practice', slide_manifest: manifest }) }).d, ATTEMPT, answers),
    ).rejects.toThrow('unauthorized');
    await expect(runVoiceFinalize(deps().d, 'not-a-uuid', answers)).rejects.toThrow('unauthorized');
  });

  it('passes server-graded results, the owner and the answer mode to the RPC', async () => {
    const { d, calls } = deps();
    const out = await runVoiceFinalize(d, ATTEMPT, answers);
    expect(calls).toEqual([
      {
        p_attempt_id: ATTEMPT,
        p_user_id: 'u1',
        p_answer_mode: 'voice',
        p_results: [
          { qid: 2, was_correct: true, transcript: 'the constitution' },
          { qid: 23, was_correct: true, transcript: 'Cruz' },
        ],
      },
    ]);
    expect(out.rpc).toEqual({ score: 1, total: 2 });
  });

  it('uses TX when the profile has no state', async () => {
    const { d, calls } = deps({ loadLocation: async () => ({ state_code: null, district_number: null }) });
    await runVoiceFinalize(d, ATTEMPT, answers);
    expect(calls[0].p_results[1].was_correct).toBe(true);
    const none = deps({ loadLocation: async () => null });
    await runVoiceFinalize(none.d, ATTEMPT, answers);
    expect(none.calls[0].p_results[1].was_correct).toBe(true);
  });
});
