'use server';

// Client-event ingest (spec §1.7 ingest.ts). Whitelisted UI telemetry only —
// server-authoritative events are emitted by DB triggers. Defense in depth:
// the RLS INSERT policy on n400_growth_events enforces the same whitelist, so
// a forged request cannot write scoring-relevant server events either way.

import { EVENT_VERSION, isClientEventType } from './events';
import { getAuthedServerClient } from './server-client';

const PAYLOAD_MAX_BYTES = 2048;

export async function ingestClientEvent(
  eventType: string,
  payload: Record<string, unknown> = {}
): Promise<{ ok: boolean; error?: string }> {
  if (!isClientEventType(eventType)) {
    return { ok: false, error: 'unknown_event_type' };
  }
  if (JSON.stringify(payload).length > PAYLOAD_MAX_BYTES) {
    return { ok: false, error: 'payload_too_large' };
  }

  const { supabase, user } = await getAuthedServerClient();
  if (!user) return { ok: false, error: 'unauthorized' };

  const { error } = await supabase.from('n400_growth_events').insert({
    user_id: user.id,
    event_type: eventType,
    event_version: EVENT_VERSION,
    payload,
  });
  if (error) return { ok: false, error: 'insert_failed' };
  return { ok: true };
}
