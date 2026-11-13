// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

// Email sign-up and sign-in never pass through /api/auth/callback, so the
// provider itself must copy the attribution cookie into the lead profile.
const sb = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: sb.signInWithPassword,
      signUp: sb.signUp,
    },
    rpc: sb.rpc,
  },
}));

import { AuthProvider, useAuth } from './AuthProvider';

const touch = { landing_page: '/vi/n400ready', ts: '2026-11-05T00:00:00.000Z', utm_source: 'facebook' };
const session = { access_token: 't', user: { id: 'u1' } };

function Probe({ action }: { action: 'signIn' | 'signUp' }) {
  const auth = useAuth();
  const [done, setDone] = useState(false);
  async function run() {
    if (action === 'signIn') await auth.signIn('a@example.com', 'pw');
    else await auth.signUp('a@example.com', 'pw', 'A B');
    setDone(true);
  }
  return <button onClick={run}>{done ? 'done' : 'go'}</button>;
}

async function press(action: 'signIn' | 'signUp') {
  render(
    <AuthProvider>
      <Probe action={action} />
    </AuthProvider>,
  );
  fireEvent.click(screen.getByText('go'));
  await screen.findByText('done');
}

beforeEach(() => {
  vi.clearAllMocks();
  sb.rpc.mockResolvedValue({ error: null });
  document.cookie = `n400_attrib=${encodeURIComponent(JSON.stringify({ first: touch, last: touch }))}; path=/`;
});

// Vitest runs without globals, so testing-library cannot unmount by itself.
afterEach(cleanup);

describe('AuthProvider attribution on email auth', () => {
  it('records attribution after an email sign-in', async () => {
    sb.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    await press('signIn');
    expect(sb.rpc).toHaveBeenCalledWith('n400_set_attribution', { p_first: touch, p_last: touch });
  });

  it('records nothing when the sign-in fails', async () => {
    sb.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } });
    await press('signIn');
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it('records attribution after an email sign-up that signs the user in', async () => {
    sb.signUp.mockResolvedValue({ data: { session }, error: null });
    await press('signUp');
    expect(sb.rpc).toHaveBeenCalledWith('n400_set_attribution', { p_first: touch, p_last: touch });
  });

  it('records nothing while the sign-up still waits for email confirmation', async () => {
    sb.signUp.mockResolvedValue({ data: { session: null }, error: null });
    await press('signUp');
    expect(sb.rpc).not.toHaveBeenCalled();
  });
});
