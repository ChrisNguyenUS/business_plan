// Voice-mock finalize orchestration (spec §6 steps 1–4, rev 3.4). The server
// action injects real Supabase calls; tests inject fakes. The RPC runs as
// service_role, so the owner check here (and again inside the RPC) is the
// only thing standing between a caller and someone else's attempt.

import type { StateCode } from '../state-data';
import { gradeVoiceMock, type GradedMockItem, type MockManifestItem } from './grade-voice-mock';

export interface VoiceFinalizeRpcArgs {
  p_attempt_id: string;
  p_user_id: string;
  p_answer_mode: 'voice' | 'typed';
  p_results: GradedMockItem[];
}

export interface VoiceFinalizeDeps {
  userId: string | null;
  loadAttempt(
    id: string,
  ): Promise<{ user_id: string; mode: string; slide_manifest: MockManifestItem[] | null } | null>;
  loadLocation(userId: string): Promise<{ state_code: string | null; district_number: number | null } | null>;
  finalizeRpc(args: VoiceFinalizeRpcArgs): Promise<Record<string, unknown>>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function runVoiceFinalize(
  deps: VoiceFinalizeDeps,
  attemptId: unknown,
  answers: unknown,
): Promise<{ rpc: Record<string, unknown>; results: GradedMockItem[] }> {
  const userId = deps.userId;
  if (!userId || typeof attemptId !== 'string' || !UUID_RE.test(attemptId)) throw new Error('unauthorized');

  const attempt = await deps.loadAttempt(attemptId);
  if (!attempt || attempt.user_id !== userId || attempt.mode !== 'mock_test') throw new Error('unauthorized');

  const profile = await deps.loadLocation(userId);
  // Same fallback the client uses for settings.stateCode (user-state.tsx).
  const stateCode = ((profile?.state_code?.trim() || 'TX') as StateCode);
  const location = { stateCode, districtNumber: profile?.district_number ?? null };

  const { results, answerMode } = gradeVoiceMock(answers, attempt.slide_manifest ?? [], location);
  const rpc = await deps.finalizeRpc({
    p_attempt_id: attemptId,
    p_user_id: userId,
    p_answer_mode: answerMode,
    p_results: results,
  });
  return { rpc, results };
}
