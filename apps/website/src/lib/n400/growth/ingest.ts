'use server';

// Client-event ingest (spec §1.7 ingest.ts). Whitelisted UI telemetry only —
// server-authoritative events are emitted by DB triggers. Defense in depth:
// the RLS INSERT policy on n400_growth_events enforces the same whitelist, so
// a forged request cannot write scoring-relevant server events either way.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { EVENT_VERSION, isClientEventType } from './events';

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

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only usage; session refresh happens in middleware.
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
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
