# Business Progress Tracker — Slice 2 (Email to the Client) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the admin moves a client-visible job step to Done or Waiting on client, a "Save & email" button sends the client one bilingual progress email (Vietnamese first, then English) through Resend, and the job page shows a log of what was sent.

**Architecture:** A pure function renders the email; a thin mailer wraps Resend and never throws; an orchestration function (`sendStepEmail`) re-reads the step, job and client from the database, validates, renders, sends and appends a row to a new admin-only table `job_notifications`. The server action only builds the Supabase client and calls it. The UI saves the step first and then asks for the email, so a failed email never undoes a saved step. All database access stays in `lib/jobs/jobs-db.ts`, which receives the Supabase client as an argument so it is unit tested with stand-ins.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript strict, Tailwind v4, Supabase (Postgres, RLS, PostgREST) via the Supabase MCP tools, Resend (`resend` ^6.12.0, the same major as the website app), Jest via `next/jest`.

**Spec:** `docs/superpowers/specs/2026-10-15-business-progress-tracker-design.md` §6, approved by the owner. Slice 1 is shipped (migrations 010 and 011 are applied); slices 0 (deploy) and 3 (portal) get their own plans.

**Differences from the spec text, decided while planning:**
- The migration is `012_job_notifications.sql` (the spec says 011, which slice 1 used for the Business tag).
- The UI saves the step with the existing `updateJobStep`, then calls a second action `emailStepUpdate(stepId)` that reads the step again from the database. This is the spec's "server action after the step is saved", split in two so the email always reflects stored data and a failed email cannot roll back the save.
- `job_notifications.step_id` and `created_by` are `ON DELETE SET NULL`: removing a step or a staff account must not delete the history of what a client was told.
- The service name in the Vietnamese half comes from the job's template (`job_templates.title_vi`); a job made without a template falls back to its English title.

## Global Constraints

- Migration `apps/internal_app/supabase/migrations/012_job_notifications.sql`, applied to prod with `apply_migration` under the name `job_notifications`, only after the owner says yes in this session.
- RLS is admin only: every policy `TO authenticated`, checks written `(select public.is_admin())`, `REVOKE ALL ON TABLE … FROM anon, PUBLIC`, every foreign key indexed. The log is append-only for the app: a read policy and an insert policy, no update or delete policy.
- When to email: only from the "Save & email" button, only when the selected status is `done` or `waiting_client` and differs from the saved status, only for a `client_visible` step, only when the client has an email. Never automatic.
- One email contains Vietnamese first, English second, the service name, progress like `3/9`, the step title, the staff-written client note (shown once) and, for `waiting_client`, a "Việc của bạn / What we need from you" block. No other personal data. Everything a person typed is HTML-escaped.
- Sending is best-effort: a provider error or a missing `RESEND_API_KEY` is returned as a message and logged as `failed`; it never throws and never undoes the saved step.
- Environment (same names as the website app): `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (default `MannaOS <notifications@mannaos.com>`), `RESEND_REPLY_TO` (default `Chris@mannaos.com`). Never print or log the key.
- The SQL tool refuses any text containing the word "drop", comments included; migration 012 has none. Subagents cannot run long SQL with writes ("Invalid or expired requestState"): the controller runs every SQL step of Task 4 and Task 6 itself.
- `internal_app` only (CLAUDE.md monorepo isolation). The one allowed change outside it is the root `pnpm-lock.yaml` that `pnpm add` rewrites.
- New files must be ESLint-clean (the app has 86 pre-existing problems elsewhere; none may be added). Unit tests only (CLAUDE.md Phase 2 scope).
- Next.js 16: read the relevant pages under `apps/internal_app/node_modules/next/dist/docs/` before writing page or action code (`apps/internal_app/AGENTS.md`).

## Review Focus

- A client with no email, a blank email or a malformed email: nothing is sent or logged, and the admin is told why (tested in `notify.test.ts`).
- A provider failure or a missing API key: the step stays saved, a `failed` row is logged, the UI says "Saved. Email not sent: …" (tested in `notify.test.ts` and `mailer.test.ts`).
- A staff note with HTML, quotes or line breaks: escaped in the HTML, line breaks kept (tested in `email.test.ts`).
- A non-admin trying to trigger a send: RLS hides the step, so nothing is sent (tested as "hidden or gone" in `notify.test.ts`; confirmed on prod in Task 6).
- A step whose status changed between the click and the send, or that was deleted: the email is built from the database, not from the browser (tested in `notify.test.ts`).

## File Structure

- Create `src/lib/jobs/email.ts` — `emailKindFor`, `renderProgressEmail` (pure).
- Create `src/lib/jobs/mailer.ts` — `SendEmail` type, `sendWithResend`.
- Create `src/lib/jobs/notify.ts` — `sendStepEmail` (read, validate, render, send, log).
- Modify `src/lib/jobs/types.ts` — `JobClient`, `JobDetail.template`, `NotificationKind`, `NotificationRow`.
- Modify `src/lib/jobs/jobs-db.ts` — `findJob` also selects the client email and template title; `findStepJobId`, `insertNotification`, `listNotifications`.
- Modify `src/actions/jobs.ts` — `emailStepUpdate`, `getJobNotifications`.
- Modify `src/components/jobs/JobStepList.tsx` — "Save & email" button and hint.
- Create `src/components/jobs/JobEmailHistory.tsx`; modify `src/app/(app)/jobs/[id]/page.tsx`.
- Create `supabase/migrations/012_job_notifications.sql`.
- Tests: `__tests__/lib/jobs/email.test.ts`, `mailer.test.ts`, `notify.test.ts`, and additions to `jobs-db.test.ts`.

Paths below are relative to `apps/internal_app/` unless they start with `docs/` or `pnpm-lock.yaml`. Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

Expected cumulative Jest totals (starting from 12 suites / 143 tests): after Task 1 `13 / 151`; Task 2 `14 / 156`; Task 3 `15 / 179`; Tasks 4–5 unchanged.

---

### Task 1: Render the progress email (pure)

**Files:**
- Create: `src/lib/jobs/email.ts`
- Test: `__tests__/lib/jobs/email.test.ts`

**Interfaces:**
- Consumes: `StepStatus` from `./progress`, `NotificationKind` from `./types` (added in Task 3 — for this task add only the type line shown in Step 3).
- Produces: `emailKindFor(status): NotificationKind | null`, `ProgressEmailInput`, `ProgressEmail`, `renderProgressEmail(input): { subject, html, text }`.

- [ ] **Step 1: Add the `NotificationKind` type**

Task 3 replaces `src/lib/jobs/types.ts` with its final version. For this task only, append this line to the end of the current `src/lib/jobs/types.ts` (Task 3's full file already contains it, so no conflict):

```ts
export type NotificationKind = 'step_done' | 'step_waiting_client'
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/lib/jobs/email.test.ts`:

```ts
import { emailKindFor, renderProgressEmail, type ProgressEmailInput } from '@/lib/jobs/email'

const base: ProgressEmailInput = {
  kind: 'step_done',
  clientName: 'An Nguyen',
  serviceEn: 'LLC formation',
  serviceVi: 'Thành lập LLC',
  progressLabel: '3/9',
  stepTitleEn: 'Get your EIN',
  stepTitleVi: 'Xin mã số thuế EIN',
  stepDescriptionEn: 'We apply for your EIN with the IRS.',
  stepDescriptionVi: 'Manna xin EIN từ IRS.',
  note: null,
}

describe('emailKindFor', () => {
  it('emails only for done and waiting_client', () => {
    expect(emailKindFor('done')).toBe('step_done')
    expect(emailKindFor('waiting_client')).toBe('step_waiting_client')
    expect(emailKindFor('todo')).toBeNull()
    expect(emailKindFor('in_progress')).toBeNull()
    expect(emailKindFor('skipped')).toBeNull()
  })
})

describe('renderProgressEmail', () => {
  it('writes a done email with both languages, Vietnamese first, and the progress', () => {
    const { subject, html, text } = renderProgressEmail(base)
    expect(subject).toBe('[Manna] LLC formation: Get your EIN — done / xong (3/9)')
    expect(html.indexOf('Xin chào An Nguyen')).toBeGreaterThan(-1)
    expect(html.indexOf('Xin chào')).toBeLessThan(html.indexOf('Hello An Nguyen'))
    expect(html).toContain('Tiến độ: 3/9')
    expect(html).toContain('Progress: 3/9')
    expect(text.indexOf('Xin chào')).toBeLessThan(text.indexOf('Hello'))
  })

  it('has no "what we need" block when the step is done', () => {
    const { html, text } = renderProgressEmail(base)
    expect(html).not.toContain('Việc của bạn')
    expect(html).not.toContain('What we need from you')
    expect(text).not.toContain('Việc của bạn')
  })

  it('adds the "what we need from you" block, with the step description, when waiting on the client', () => {
    const { subject, html, text } = renderProgressEmail({ ...base, kind: 'step_waiting_client' })
    expect(subject).toBe('[Manna] LLC formation: action needed / cần bạn hỗ trợ — Get your EIN')
    expect(html).toContain('Việc của bạn')
    expect(html).toContain('What we need from you')
    expect(html).toContain('Manna xin EIN từ IRS.')
    expect(html).toContain('We apply for your EIN with the IRS.')
    expect(text).toContain('Việc của bạn: Manna xin EIN từ IRS.')
    expect(text).toContain('What we need from you: We apply for your EIN with the IRS.')
  })

  it('still shows the block when the step has no description', () => {
    const { html } = renderProgressEmail({
      ...base,
      kind: 'step_waiting_client',
      stepDescriptionEn: null,
      stepDescriptionVi: null,
    })
    expect(html).toContain('Việc của bạn')
    expect(html).toContain('What we need from you')
  })

  it('escapes everything a person typed', () => {
    const { html } = renderProgressEmail({
      ...base,
      clientName: '<b>An</b>',
      stepTitleEn: '<script>alert(1)</script>',
      note: 'say "hi" & <i>bye</i>',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>An</b>')
    expect(html).not.toContain('<i>bye</i>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('say &quot;hi&quot; &amp; &lt;i&gt;bye&lt;/i&gt;')
  })

  it('shows the note once, keeps its line breaks, and leaves it out when blank', () => {
    const withNote = renderProgressEmail({ ...base, note: 'Line one\nLine two' })
    expect(withNote.html).toContain('Line one<br>Line two')
    expect(withNote.html.match(/Line one/g)).toHaveLength(1)
    expect(withNote.text).toContain('Line one\nLine two')

    for (const note of [null, '', '   \n ']) {
      const out = renderProgressEmail({ ...base, note })
      expect(out.html).not.toContain('Ghi chú từ Manna')
      expect(out.text).not.toContain('Ghi chú từ Manna')
    }
  })

  it('keeps the subject on one line even if a title has line breaks', () => {
    const { subject } = renderProgressEmail({ ...base, stepTitleEn: 'Get\r\nyour EIN' })
    expect(subject).not.toMatch(/[\r\n]/)
    expect(subject).toContain('Get your EIN')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/email.test.ts`
Expected: FAIL, `Cannot find module '@/lib/jobs/email'`.

- [ ] **Step 4: Implement**

Create `src/lib/jobs/email.ts`:

```ts
import type { StepStatus } from './progress'
import type { NotificationKind } from './types'

/** Which email a step status calls for; null for statuses that never email. */
export function emailKindFor(status: StepStatus): NotificationKind | null {
  if (status === 'done') return 'step_done'
  if (status === 'waiting_client') return 'step_waiting_client'
  return null
}

export interface ProgressEmailInput {
  kind: NotificationKind
  clientName: string
  serviceEn: string
  serviceVi: string
  /** "3/8", from formatProgressLabel. */
  progressLabel: string
  stepTitleEn: string
  stepTitleVi: string
  stepDescriptionEn: string | null
  stepDescriptionVi: string | null
  /** The staff-written client note; one language, shown once. */
  note: string | null
}

export interface ProgressEmail {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** A header value must stay on one line. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function htmlWithBreaks(value: string): string {
  return value.split(/\r?\n/).map(escapeHtml).join('<br>')
}

const BOX = 'margin:12px 0;padding:10px 14px;border-left:4px solid #3AAFB9;background:#f4fafb'

/**
 * One bilingual email, Vietnamese first. Pure: no I/O, so it is tested without
 * a mail provider. Everything that comes from a person is escaped in the HTML.
 */
export function renderProgressEmail(input: ProgressEmailInput): ProgressEmail {
  const done = input.kind === 'step_done'
  const subject = oneLine(
    done
      ? `[Manna] ${input.serviceEn}: ${input.stepTitleEn} — done / xong (${input.progressLabel})`
      : `[Manna] ${input.serviceEn}: action needed / cần bạn hỗ trợ — ${input.stepTitleEn}`
  )

  const vi = {
    hello: `Xin chào ${input.clientName},`,
    line: done
      ? `Bước "${input.stepTitleVi}" của dịch vụ "${input.serviceVi}" đã hoàn tất.`
      : `Dịch vụ "${input.serviceVi}" đang chờ bạn ở bước "${input.stepTitleVi}".`,
    progress: `Tiến độ: ${input.progressLabel}`,
    todo: 'Việc của bạn',
    detail: input.stepDescriptionVi,
  }
  const en = {
    hello: `Hello ${input.clientName},`,
    line: done
      ? `The step "${input.stepTitleEn}" of your "${input.serviceEn}" service is complete.`
      : `Your "${input.serviceEn}" service is waiting on you at the step "${input.stepTitleEn}".`,
    progress: `Progress: ${input.progressLabel}`,
    todo: 'What we need from you',
    detail: input.stepDescriptionEn,
  }
  const noteLabel = 'Ghi chú từ Manna / Note from Manna'
  const footer = 'Trả lời email này nếu bạn có câu hỏi. / Reply to this email if you have questions.'
  const sign = 'Manna One Solution'

  const htmlSection = (s: typeof vi) =>
    [
      `<p>${escapeHtml(s.hello)}</p>`,
      `<p>${escapeHtml(s.line)} <strong>${escapeHtml(s.progress)}</strong></p>`,
      !done
        ? `<div style="${BOX}"><strong>${escapeHtml(s.todo)}</strong>${
            s.detail ? `<br>${htmlWithBreaks(s.detail)}` : ''
          }</div>`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

  const note = input.note?.trim() ? input.note.trim() : null
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2933;max-width:560px">',
    htmlSection(vi),
    '<hr style="border:none;border-top:1px solid #e1e8ed;margin:20px 0">',
    htmlSection(en),
    note
      ? `<p style="margin-top:20px"><em>${escapeHtml(noteLabel)}:</em><br>${htmlWithBreaks(note)}</p>`
      : '',
    `<p style="color:#6b7785;font-size:13px;margin-top:24px">${escapeHtml(footer)}<br>${escapeHtml(sign)}</p>`,
    '</div>',
  ]
    .filter(Boolean)
    .join('\n')

  const textSection = (s: typeof vi) =>
    [s.hello, '', `${s.line} ${s.progress}`, ...(!done ? ['', `${s.todo}${s.detail ? `: ${s.detail}` : ''}`] : [])].join('\n')
  const text = [
    textSection(vi),
    '',
    '---',
    '',
    textSection(en),
    ...(note ? ['', `${noteLabel}:`, note] : []),
    '',
    footer,
    sign,
  ].join('\n')

  return { subject, html, text }
}
```

- [ ] **Step 5: Run the test, type-check and lint**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/email.test.ts` — Expected: `Tests: 8 passed`.
Run: `pnpm --filter internal_app type-check` and `pnpm --filter internal_app exec eslint src/lib/jobs/email.ts __tests__/lib/jobs/email.test.ts` — Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add apps/internal_app/src/lib/jobs/email.ts apps/internal_app/src/lib/jobs/types.ts apps/internal_app/__tests__/lib/jobs/email.test.ts
git commit -m "$(cat <<'EOF'
feat(internal-app): bilingual progress email renderer

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Mailer on Resend

**Files:**
- Modify: `package.json`, root `pnpm-lock.yaml` (by `pnpm add`)
- Create: `src/lib/jobs/mailer.ts`
- Test: `__tests__/lib/jobs/mailer.test.ts`

**Interfaces:**
- Consumes: `Result` from `./types`.
- Produces: `OutgoingEmail`, `SendEmail`, `DEFAULT_FROM`, `DEFAULT_REPLY_TO`, `sendWithResend`.

- [ ] **Step 1: Add the dependency**

Run (from the repo root): `pnpm --filter internal_app add resend@^6.12.0`
Expected: `apps/internal_app/package.json` gains `"resend": "^6.12.0"` under `dependencies` and `pnpm-lock.yaml` changes. If pnpm needs the network and it is unavailable, report BLOCKED.

- [ ] **Step 2: Write the failing test**

Create `__tests__/lib/jobs/mailer.test.ts`:

```ts
import { DEFAULT_FROM, DEFAULT_REPLY_TO, sendWithResend } from '@/lib/jobs/mailer'

const send = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}))

const email = { to: 'an@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' }
const ENV_KEYS = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_REPLY_TO'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  send.mockReset()
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('sendWithResend', () => {
  it('does nothing and says why when there is no API key', async () => {
    const result = await sendWithResend(email)
    expect(result).toEqual({
      ok: false,
      error: 'Email is not configured (RESEND_API_KEY is missing).',
    })
    expect(send).not.toHaveBeenCalled()
  })

  it('sends with the default sender and reply-to and returns the provider id', async () => {
    process.env.RESEND_API_KEY = 're_test'
    send.mockResolvedValue({ data: { id: 'msg_1' }, error: null })
    const result = await sendWithResend(email)
    expect(send).toHaveBeenCalledWith({
      from: DEFAULT_FROM,
      to: ['an@example.com'],
      replyTo: DEFAULT_REPLY_TO,
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
    })
    expect(result).toEqual({ ok: true, value: { id: 'msg_1' } })
  })

  it('takes sender and reply-to from the environment', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.RESEND_FROM_EMAIL = 'Manna <hello@example.com>'
    process.env.RESEND_REPLY_TO = 'desk@example.com'
    send.mockResolvedValue({ data: { id: 'msg_2' }, error: null })
    await sendWithResend(email)
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Manna <hello@example.com>', replyTo: 'desk@example.com' })
    )
  })

  it('turns a provider error into a result, not an exception', async () => {
    process.env.RESEND_API_KEY = 're_test'
    send.mockResolvedValue({ data: null, error: { message: 'domain not verified' } })
    expect(await sendWithResend(email)).toEqual({ ok: false, error: 'domain not verified' })
  })

  it('turns a thrown error into a result, not an exception', async () => {
    process.env.RESEND_API_KEY = 're_test'
    send.mockRejectedValue(new Error('network down'))
    expect(await sendWithResend(email)).toEqual({ ok: false, error: 'network down' })
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/mailer.test.ts`
Expected: FAIL, `Cannot find module '@/lib/jobs/mailer'`.

- [ ] **Step 4: Implement**

Create `src/lib/jobs/mailer.ts`:

```ts
import type { Result } from './types'

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  text: string
}

/** What notify.ts needs from a mail provider; tests pass a stand-in. */
export type SendEmail = (email: OutgoingEmail) => Promise<Result<{ id: string | null }>>

export const DEFAULT_FROM = 'MannaOS <notifications@mannaos.com>'
export const DEFAULT_REPLY_TO = 'Chris@mannaos.com'

/**
 * Sends through Resend, same env names as the website app. Never throws:
 * a missing key or a provider error comes back as { ok: false }.
 */
export const sendWithResend: SendEmail = async (email) => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'Email is not configured (RESEND_API_KEY is missing).' }
  }
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to: [email.to],
      replyTo: process.env.RESEND_REPLY_TO || DEFAULT_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, value: { id: data?.id ?? null } }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error while sending.' }
  }
}
```

- [ ] **Step 5: Run the test, type-check and lint**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/mailer.test.ts` — Expected: `Tests: 5 passed`.
Run: `pnpm --filter internal_app type-check` and `pnpm --filter internal_app exec eslint src/lib/jobs/mailer.ts __tests__/lib/jobs/mailer.test.ts` — Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add apps/internal_app/package.json pnpm-lock.yaml apps/internal_app/src/lib/jobs/mailer.ts apps/internal_app/__tests__/lib/jobs/mailer.test.ts
git commit -m "$(cat <<'EOF'
feat(internal-app): Resend mailer for progress emails

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Data access and `sendStepEmail`

**Files:**
- Modify (replace with the full text below): `src/lib/jobs/types.ts`, `src/lib/jobs/jobs-db.ts`
- Create: `src/lib/jobs/notify.ts`
- Test: `__tests__/lib/jobs/notify.test.ts` (new), `__tests__/lib/jobs/jobs-db.test.ts` (additions)

**Interfaces:**
- Consumes: `renderProgressEmail`, `emailKindFor` (Task 1); `SendEmail` (Task 2); `deriveProgress`, `formatProgressLabel` (slice 1).
- Produces: `findStepJobId`, `insertNotification`, `listNotifications`, `NOTIFICATIONS_LIMIT`, `NewNotification`; `sendStepEmail(db, send, stepId, userId): Promise<Result<{ to: string }>>`; types `JobClient`, `NotificationRow`; `JobDetail.client` now has `email`, `JobDetail.template`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/jobs/notify.test.ts`:

```ts
import type { Db } from '@/lib/jobs/jobs-db'
import type { SendEmail } from '@/lib/jobs/mailer'
import { sendStepEmail } from '@/lib/jobs/notify'
import type { JobDetail, JobStepRow } from '@/lib/jobs/types'

const STEP_ID = '5f1c2b6e-1d64-4b8e-9d57-3c0f3b6d2a11'
const JOB_ID = 'job-1'
const USER_ID = 'user-1'

function step(over: Partial<JobStepRow> = {}): JobStepRow {
  return {
    id: STEP_ID,
    job_id: JOB_ID,
    position: 6,
    title_en: 'Get your EIN',
    title_vi: 'Xin mã số thuế EIN',
    description_en: 'We apply for your EIN.',
    description_vi: 'Manna xin EIN.',
    owner: 'manna',
    client_visible: true,
    status: 'done',
    client_note: 'All good.',
    internal_note: 'secret',
    started_at: null,
    completed_at: null,
    updated_at: '2026-10-16T00:00:00Z',
    ...over,
  }
}

function job(over: Partial<JobDetail> = {}, steps: JobStepRow[] = [step()]): JobDetail {
  return {
    id: JOB_ID,
    service_type: 'business',
    description: 'LLC formation',
    status: 'in_progress',
    fee: 1500,
    deadline: null,
    notes: null,
    template_key: 'tx_llc',
    created_at: '2026-10-16T00:00:00Z',
    updated_at: '2026-10-16T00:00:00Z',
    client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: 'an@example.com' },
    template: { title_vi: 'Thành lập LLC' },
    steps,
    ...over,
  }
}

function fakeDb(opts: { stepJobId?: string | null; job?: JobDetail | null; insertError?: string }) {
  const inserts: Array<Record<string, unknown>> = []
  const chain = (result: unknown) => {
    const q: Record<string, jest.Mock> = {}
    q.select = jest.fn(() => q)
    q.eq = jest.fn(() => q)
    q.order = jest.fn(() => q)
    q.maybeSingle = jest.fn().mockResolvedValue(result)
    return q
  }
  const from = jest.fn((table: string) => {
    if (table === 'job_steps') {
      const id = opts.stepJobId === undefined ? JOB_ID : opts.stepJobId
      return chain({ data: id ? { job_id: id } : null, error: null })
    }
    if (table === 'jobs') {
      const j = opts.job === undefined ? job() : opts.job
      return chain({ data: j, error: null })
    }
    return {
      insert: jest.fn(async (row: Record<string, unknown>) => {
        inserts.push(row)
        return { error: opts.insertError ? { message: opts.insertError } : null }
      }),
    }
  })
  return { db: { from } as unknown as Db, inserts }
}

const okSend = (): jest.MockedFunction<SendEmail> =>
  jest.fn().mockResolvedValue({ ok: true, value: { id: 'msg_1' } })

describe('sendStepEmail', () => {
  it('renders from what the database holds, sends to the client, and logs a sent row', async () => {
    const { db, inserts } = fakeDb({})
    const send = okSend()
    const result = await sendStepEmail(db, send, STEP_ID, USER_ID)

    expect(result).toEqual({ ok: true, value: { to: 'an@example.com' } })
    expect(send).toHaveBeenCalledTimes(1)
    const sent = send.mock.calls[0][0]
    expect(sent.to).toBe('an@example.com')
    expect(sent.subject).toBe('[Manna] LLC formation: Get your EIN — done / xong (1/1)')
    expect(sent.html).toContain('Thành lập LLC')
    expect(sent.html).toContain('All good.')
    expect(sent.html).not.toContain('secret')
    expect(inserts).toEqual([
      {
        job_id: JOB_ID,
        step_id: STEP_ID,
        kind: 'step_done',
        to_email: 'an@example.com',
        status: 'sent',
        error: null,
        created_by: USER_ID,
      },
    ])
  })

  it('uses the waiting_client kind and falls back to the job title when there is no template', async () => {
    const { db, inserts } = fakeDb({
      job: job({ template: null }, [step({ status: 'waiting_client' })]),
    })
    const send = okSend()
    await sendStepEmail(db, send, STEP_ID, null)
    expect(inserts[0]).toMatchObject({ kind: 'step_waiting_client', created_by: null })
    expect(send.mock.calls[0][0].html).toContain('Việc của bạn')
    expect(send.mock.calls[0][0].subject).toContain('action needed')
  })

  it('logs a failed row and returns the reason when the provider fails', async () => {
    const { db, inserts } = fakeDb({})
    const send: SendEmail = jest.fn().mockResolvedValue({ ok: false, error: 'domain not verified' })
    const result = await sendStepEmail(db, send, STEP_ID, USER_ID)
    expect(result).toEqual({
      ok: false,
      error: 'The email could not be sent: domain not verified',
    })
    expect(inserts[0]).toMatchObject({ status: 'failed', error: 'domain not verified' })
  })

  it('still reports success when only the log insert fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const { db } = fakeDb({ insertError: 'permission denied' })
    const result = await sendStepEmail(db, okSend(), STEP_ID, USER_ID)
    expect(result).toEqual({ ok: true, value: { to: 'an@example.com' } })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it.each([
    ['the step is hidden or gone', { stepJobId: null }],
    ['the job is hidden or gone', { job: null }],
    ['the job no longer lists the step', { job: job({}, []) }],
  ])('refuses when %s, and sends nothing', async (_name, opts) => {
    const { db, inserts } = fakeDb(opts)
    const send = okSend()
    const result = await sendStepEmail(db, send, STEP_ID, USER_ID)
    expect(result).toEqual({
      ok: false,
      error: 'That step no longer exists, or you do not have access to it.',
    })
    expect(send).not.toHaveBeenCalled()
    expect(inserts).toEqual([])
  })

  it.each([
    ['not visible to the client', job({}, [step({ client_visible: false })]), 'This step is not visible to the client.'],
    ['still to do', job({}, [step({ status: 'todo' })]), 'Only a step that is done or waiting on the client can be emailed.'],
    ['in progress', job({}, [step({ status: 'in_progress' })]), 'Only a step that is done or waiting on the client can be emailed.'],
    ['for a client with no email', job({ client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: null } }), 'This client has no email address on file.'],
    ['for a client with a blank email', job({ client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: '  ' } }), 'This client has no email address on file.'],
    ['for a client with a malformed email', job({ client: { id: 'c1', first_name: 'An', last_name: 'Nguyen', email: 'not-an-email' } }), 'The client email address looks invalid.'],
    ['for a job with no client', job({ client: null }), 'This client has no email address on file.'],
  ])('refuses a step %s, and sends and logs nothing', async (_name, j, error) => {
    const { db, inserts } = fakeDb({ job: j })
    const send = okSend()
    expect(await sendStepEmail(db, send, STEP_ID, USER_ID)).toEqual({ ok: false, error })
    expect(send).not.toHaveBeenCalled()
    expect(inserts).toEqual([])
  })

  it('counts progress over all the job steps, not just the emailed one', async () => {
    const steps = [
      step({ id: 'a', position: 1, status: 'done' }),
      step({ id: STEP_ID, position: 2, status: 'done' }),
      step({ id: 'c', position: 3, status: 'todo' }),
    ]
    const { db } = fakeDb({ job: job({}, steps) })
    const send = okSend()
    await sendStepEmail(db, send, STEP_ID, USER_ID)
    expect(send.mock.calls[0][0].subject).toContain('(2/3)')
  })
})
```

In `__tests__/lib/jobs/jobs-db.test.ts` replace the first import block (`import { createJobFromTemplateRpc, listJobs, toJobTemplateSummary, updateStep, type Db } from '@/lib/jobs/jobs-db'`, written over several lines) with this one:

```ts
import {
  createJobFromTemplateRpc,
  findStepJobId,
  insertNotification,
  listJobs,
  listNotifications,
  toJobTemplateSummary,
  updateStep,
  type Db,
} from '@/lib/jobs/jobs-db'
```

and append this to the end of the file:

```ts
describe('findStepJobId', () => {
  function stepDb(result: { data: unknown; error: { message: string } | null }) {
    const maybeSingle = jest.fn().mockResolvedValue(result)
    const eq = jest.fn(() => ({ maybeSingle }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { db: { from } as unknown as Db, from, select, eq }
  }

  it('returns the job id of the step', async () => {
    const { db, from, select, eq } = stepDb({ data: { job_id: 'job-9' }, error: null })
    expect(await findStepJobId(db, STEP_ID)).toBe('job-9')
    expect(from).toHaveBeenCalledWith('job_steps')
    expect(select).toHaveBeenCalledWith('job_id')
    expect(eq).toHaveBeenCalledWith('id', STEP_ID)
  })

  it('returns null when no row comes back', async () => {
    const { db } = stepDb({ data: null, error: null })
    expect(await findStepJobId(db, STEP_ID)).toBeNull()
  })

  it('throws on a database error', async () => {
    const { db } = stepDb({ data: null, error: { message: 'boom' } })
    await expect(findStepJobId(db, STEP_ID)).rejects.toEqual({ message: 'boom' })
  })
})

describe('insertNotification', () => {
  const row = {
    jobId: 'job-1',
    stepId: STEP_ID,
    kind: 'step_done' as const,
    toEmail: 'an@example.com',
    status: 'failed' as const,
    error: 'x'.repeat(800),
    createdBy: 'user-1',
  }

  function insertDb(error: { message: string } | null) {
    const insert = jest.fn().mockResolvedValue({ error })
    const from = jest.fn(() => ({ insert }))
    return { db: { from } as unknown as Db, from, insert }
  }

  it('maps the fields to the columns and cuts a long error to 500 characters', async () => {
    const { db, from, insert } = insertDb(null)
    expect(await insertNotification(db, row)).toEqual({ ok: true, value: null })
    expect(from).toHaveBeenCalledWith('job_notifications')
    expect(insert).toHaveBeenCalledWith({
      job_id: 'job-1',
      step_id: STEP_ID,
      kind: 'step_done',
      to_email: 'an@example.com',
      status: 'failed',
      error: 'x'.repeat(500),
      created_by: 'user-1',
    })
  })

  it('stores a missing error as null', async () => {
    const { db, insert } = insertDb(null)
    await insertNotification(db, { ...row, status: 'sent', error: null })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ error: null, status: 'sent' }))
  })

  it('returns the database message instead of throwing', async () => {
    const { db } = insertDb({ message: 'permission denied' })
    expect(await insertNotification(db, row)).toEqual({ ok: false, error: 'permission denied' })
  })
})

describe('listNotifications', () => {
  function listDb(result: { data: unknown; error: { message: string } | null }) {
    const limit = jest.fn().mockResolvedValue(result)
    const order = jest.fn(() => ({ limit }))
    const eq = jest.fn(() => ({ order }))
    const select = jest.fn(() => ({ eq }))
    const from = jest.fn(() => ({ select }))
    return { db: { from } as unknown as Db, from, eq, order, limit }
  }

  it("lists one job's log, newest first, capped at 20", async () => {
    const rows = [{ id: 'n1' }]
    const { db, from, eq, order, limit } = listDb({ data: rows, error: null })
    expect(await listNotifications(db, 'job-1')).toEqual(rows)
    expect(from).toHaveBeenCalledWith('job_notifications')
    expect(eq).toHaveBeenCalledWith('job_id', 'job-1')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(limit).toHaveBeenCalledWith(20)
  })

  it('returns an empty list for no rows, and throws on a database error', async () => {
    expect(await listNotifications(listDb({ data: null, error: null }).db, 'job-1')).toEqual([])
    const { db } = listDb({ data: null, error: { message: 'boom' } })
    await expect(listNotifications(db, 'job-1')).rejects.toEqual({ message: 'boom' })
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter internal_app exec jest __tests__/lib/jobs/notify.test.ts __tests__/lib/jobs/jobs-db.test.ts`
Expected: FAIL (`Cannot find module '@/lib/jobs/notify'`; the new jobs-db tests fail because the functions are not exported).

- [ ] **Step 3: Implement**

Replace `src/lib/jobs/types.ts` with:

```ts
import type { JobStatus, StepOwner, StepStatus } from './progress'

/** Outcome of an operation that can fail on user input or at the database. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export type JobServiceType = 'immigration' | 'tax' | 'insurance' | 'ai' | 'business'

export interface ClientBrief {
  id: string
  first_name: string
  last_name: string
}

/** The client on a job's detail page; the email is what progress emails go to. */
export interface JobClient extends ClientBrief {
  email: string | null
}

export interface JobTemplateSummary {
  key: string
  service_type: JobServiceType
  title_en: string
  title_vi: string
  description_en: string | null
  description_vi: string | null
  step_count: number
}

export interface JobStepRow {
  id: string
  job_id: string
  position: number
  title_en: string
  title_vi: string
  description_en: string | null
  description_vi: string | null
  owner: StepOwner
  client_visible: boolean
  status: StepStatus
  client_note: string | null
  internal_note: string | null
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface JobListRow {
  id: string
  service_type: JobServiceType
  description: string
  status: JobStatus
  fee: number
  deadline: string | null
  template_key: string | null
  updated_at: string
  client: ClientBrief | null
  steps: Array<{ status: StepStatus }>
}

export interface JobDetail {
  id: string
  service_type: JobServiceType
  description: string
  status: JobStatus
  fee: number
  deadline: string | null
  notes: string | null
  template_key: string | null
  created_at: string
  updated_at: string
  client: JobClient | null
  /** The service name in Vietnamese, from the template; null for a job made without one. */
  template: { title_vi: string } | null
  steps: JobStepRow[]
}

export type NotificationKind = 'step_done' | 'step_waiting_client'

export interface NotificationRow {
  id: string
  kind: NotificationKind
  to_email: string
  status: 'sent' | 'failed'
  error: string | null
  created_at: string
  step: { position: number; title_en: string } | null
}
```

Replace `src/lib/jobs/jobs-db.ts` with:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { JobFilters } from './filters'
import type { NewJobInput, StepPatch } from './validation'
import type {
  ClientBrief,
  JobDetail,
  JobListRow,
  JobStepRow,
  JobTemplateSummary,
  NotificationKind,
  NotificationRow,
  Result,
} from './types'

/**
 * Database access for jobs. Every function takes the Supabase client as an
 * argument, so the Next.js server actions stay thin and this file can be
 * tested with a stand-in client.
 */
export type Db = Pick<SupabaseClient, 'from' | 'rpc'>

export const JOBS_LIST_LIMIT = 50

const STEP_COLUMNS =
  'id, job_id, position, title_en, title_vi, description_en, description_vi, owner, client_visible, status, client_note, internal_note, started_at, completed_at, updated_at'

const JOB_LIST_COLUMNS =
  'id, service_type, description, status, fee, deadline, template_key, updated_at, client:clients(id, first_name, last_name), steps:job_steps(status)'

const JOB_DETAIL_COLUMNS = `id, service_type, description, status, fee, deadline, notes, template_key, created_at, updated_at, client:clients(id, first_name, last_name, email), template:job_templates(title_vi), steps:job_steps(${STEP_COLUMNS})`

/** PostgREST may return numeric columns as numbers or strings; the UI wants a number. */
function withNumericFee<T extends { fee: unknown }>(row: T): Omit<T, 'fee'> & { fee: number } {
  return { ...row, fee: Number(row.fee) }
}

/** Most recently touched first. Pass clientId to see one client's jobs; filters narrow by status / service. */
export async function listJobs(
  db: Db,
  opts: { clientId?: string; limit?: number; filters?: JobFilters } = {}
): Promise<JobListRow[]> {
  let query = db
    .from('jobs')
    .select(JOB_LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(opts.limit ?? JOBS_LIST_LIMIT)
  if (opts.clientId) query = query.eq('client_id', opts.clientId)
  if (opts.filters?.status) query = query.eq('status', opts.filters.status)
  if (opts.filters?.service) query = query.eq('service_type', opts.filters.service)

  const { data, error } = await query
  // Throw rather than return []: an RLS-filtered result and a genuinely empty
  // list look the same, and that ambiguity is what makes this hard to debug.
  if (error) throw error
  return ((data ?? []) as unknown as Array<JobListRow & { fee: unknown }>).map(
    (row) => withNumericFee(row) as JobListRow
  )
}

/** One job with its steps in order, or null when the id does not exist or RLS hides it. */
export async function findJob(db: Db, id: string): Promise<JobDetail | null> {
  const { data, error } = await db
    .from('jobs')
    .select(JOB_DETAIL_COLUMNS)
    .eq('id', id)
    .order('position', { referencedTable: 'job_steps', ascending: true })
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return withNumericFee(data as unknown as JobDetail & { fee: unknown }) as JobDetail
}

type TemplateRow = Omit<JobTemplateSummary, 'step_count'> & {
  steps: Array<{ count: number }> | null
}

/** PostgREST returns an embedded count as [{ count: n }]. */
export function toJobTemplateSummary(row: TemplateRow): JobTemplateSummary {
  const { steps, ...rest } = row
  return { ...rest, step_count: steps?.[0]?.count ?? 0 }
}

export async function listJobTemplates(db: Db): Promise<JobTemplateSummary[]> {
  const { data, error } = await db
    .from('job_templates')
    .select(
      'key, service_type, title_en, title_vi, description_en, description_vi, steps:job_template_steps(count)'
    )
    .eq('active', true)
    .order('title_en', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as TemplateRow[]).map(toJobTemplateSummary)
}

export async function findClientBrief(db: Db, id: string): Promise<ClientBrief | null> {
  const { data, error } = await db
    .from('clients')
    .select('id, first_name, last_name')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as ClientBrief | null) ?? null
}

/** Creates the job and copies the template's steps in one transaction (a SQL function). */
export async function createJobFromTemplateRpc(
  db: Db,
  input: NewJobInput
): Promise<Result<{ id: string }>> {
  const { data, error } = await db.rpc('create_job_from_template', {
    p_client_id: input.clientId,
    p_template_key: input.templateKey,
    p_fee: input.fee,
    p_deadline: input.deadline,
    p_notes: input.notes,
  })
  if (error) {
    if (error.code === 'P0002') {
      return { ok: false, error: 'That service template is not available.' }
    }
    return { ok: false, error: `Could not create the job: ${error.message}` }
  }
  return { ok: true, value: { id: data as string } }
}

export async function updateStep(
  db: Db,
  stepId: string,
  patch: StepPatch
): Promise<Result<JobStepRow>> {
  const { data, error } = await db
    .from('job_steps')
    .update(patch)
    .eq('id', stepId)
    .select(STEP_COLUMNS)
    .single()
  if (error) {
    // PGRST116: no row came back, because the step is gone or RLS hides it.
    if (error.code === 'PGRST116') {
      return { ok: false, error: 'That step no longer exists, or you do not have access to it.' }
    }
    return { ok: false, error: `Could not save the step: ${error.message}` }
  }
  return { ok: true, value: data as unknown as JobStepRow }
}

/** The job a step belongs to, or null when the step does not exist or RLS hides it. */
export async function findStepJobId(db: Db, stepId: string): Promise<string | null> {
  const { data, error } = await db
    .from('job_steps')
    .select('job_id')
    .eq('id', stepId)
    .maybeSingle()
  if (error) throw error
  return (data as { job_id: string } | null)?.job_id ?? null
}

export interface NewNotification {
  jobId: string
  stepId: string
  kind: NotificationKind
  toEmail: string
  status: 'sent' | 'failed'
  error: string | null
  createdBy: string | null
}

const ERROR_TEXT_LIMIT = 500

/** Appends one row to the send log. The caller decides what a failure here means. */
export async function insertNotification(db: Db, n: NewNotification): Promise<Result<null>> {
  const { error } = await db.from('job_notifications').insert({
    job_id: n.jobId,
    step_id: n.stepId,
    kind: n.kind,
    to_email: n.toEmail,
    status: n.status,
    error: n.error === null ? null : n.error.slice(0, ERROR_TEXT_LIMIT),
    created_by: n.createdBy,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, value: null }
}

export const NOTIFICATIONS_LIMIT = 20

/** Newest first. Throws on a database error, like the other reads. */
export async function listNotifications(db: Db, jobId: string): Promise<NotificationRow[]> {
  const { data, error } = await db
    .from('job_notifications')
    .select('id, kind, to_email, status, error, created_at, step:job_steps(position, title_en)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT)
  if (error) throw error
  return (data ?? []) as unknown as NotificationRow[]
}
```

Create `src/lib/jobs/notify.ts`:

```ts
import { findJob, findStepJobId, insertNotification, type Db } from './jobs-db'
import { emailKindFor, renderProgressEmail } from './email'
import type { SendEmail } from './mailer'
import { deriveProgress, formatProgressLabel } from './progress'
import type { Result } from './types'

// A deliberately loose check: it only has to catch a typo before a send,
// the provider is the real judge.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GONE = 'That step no longer exists, or you do not have access to it.'

/**
 * Emails the client about one step, using what the database holds now (not
 * what the browser thinks it saved). Reading the step first is also the
 * gate: RLS hides it from anyone who is not an admin, so they cannot send.
 */
export async function sendStepEmail(
  db: Db,
  send: SendEmail,
  stepId: string,
  userId: string | null
): Promise<Result<{ to: string }>> {
  const jobId = await findStepJobId(db, stepId)
  if (!jobId) return { ok: false, error: GONE }
  const job = await findJob(db, jobId)
  const step = job?.steps.find((s) => s.id === stepId)
  if (!job || !step) return { ok: false, error: GONE }

  if (!step.client_visible) return { ok: false, error: 'This step is not visible to the client.' }
  const kind = emailKindFor(step.status)
  if (!kind) {
    return { ok: false, error: 'Only a step that is done or waiting on the client can be emailed.' }
  }
  const to = job.client?.email?.trim() ?? ''
  if (!to) return { ok: false, error: 'This client has no email address on file.' }
  if (!EMAIL_RE.test(to)) return { ok: false, error: 'The client email address looks invalid.' }

  const email = renderProgressEmail({
    kind,
    clientName: `${job.client?.first_name ?? ''} ${job.client?.last_name ?? ''}`.trim(),
    serviceEn: job.description,
    serviceVi: job.template?.title_vi ?? job.description,
    progressLabel: formatProgressLabel(deriveProgress(job.steps), job.steps.length),
    stepTitleEn: step.title_en,
    stepTitleVi: step.title_vi,
    stepDescriptionEn: step.description_en,
    stepDescriptionVi: step.description_vi,
    note: step.client_note,
  })

  const sent = await send({ to, ...email })

  // Best-effort log: the email has already left (or failed) either way.
  const logged = await insertNotification(db, {
    jobId,
    stepId,
    kind,
    toEmail: to,
    status: sent.ok ? 'sent' : 'failed',
    error: sent.ok ? null : sent.error,
    createdBy: userId,
  })
  if (!logged.ok) console.error('Could not log the progress email:', logged.error)

  if (!sent.ok) return { ok: false, error: `The email could not be sent: ${sent.error}` }
  return { ok: true, value: { to } }
}
```

- [ ] **Step 4: Run all checks**

Run: `pnpm --filter internal_app test` — Expected: `Test Suites: 15 passed`, `Tests: 179 passed` (notify 15, jobs-db 21).
Run: `pnpm --filter internal_app type-check` — Expected: clean.
Run: `pnpm --filter internal_app exec eslint src/lib/jobs __tests__/lib/jobs` — Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/internal_app/src/lib/jobs/types.ts apps/internal_app/src/lib/jobs/jobs-db.ts apps/internal_app/src/lib/jobs/notify.ts apps/internal_app/__tests__/lib/jobs/notify.test.ts apps/internal_app/__tests__/lib/jobs/jobs-db.test.ts
git commit -m "$(cat <<'EOF'
feat(internal-app): email a job step to the client and log it

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Migration 012 (file by a subagent, SQL steps by the controller)

**Files:**
- Create: `supabase/migrations/012_job_notifications.sql`

**Interfaces:**
- Consumes: `public.jobs`, `public.job_steps`, `public.profiles`, `public.is_admin()` (slice 1 / earlier migrations).
- Produces: table `public.job_notifications` as used by `insertNotification` and `listNotifications` (columns `id, job_id, step_id, kind, to_email, status, error, created_by, created_at`).

The migration is **not applied** in this task; the dry run below proves it in a rolled-back transaction. Applying it is Task 6 and needs the owner's yes.

- [ ] **Step 1 (subagent): Write the migration file**

Create `supabase/migrations/012_job_notifications.sql` exactly as:

```sql
-- 012_job_notifications.sql
--
-- Business progress tracker, slice 2: the log of progress emails sent to a
-- client about a job step. One row per attempt, sent or failed.
--
-- Admin only, like the rest of the tracker (see 010): the log holds the
-- client's email address. It is append-only for the app: there is a read
-- policy and an insert policy and no update or delete policy, so RLS refuses
-- both. Rows leave only when their job is deleted (cascade).
--
-- Shape follows 010: every policy TO authenticated, auth checks wrapped in
-- (select ...), every foreign key indexed, nothing for anon.

CREATE TABLE public.job_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  step_id    uuid REFERENCES public.job_steps(id) ON DELETE SET NULL,
  kind       text NOT NULL CHECK (kind IN ('step_done', 'step_waiting_client')),
  to_email   text NOT NULL,
  status     text NOT NULL CHECK (status IN ('sent', 'failed')),
  error      text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_notifications_job_id_idx     ON public.job_notifications (job_id, created_at DESC);
CREATE INDEX job_notifications_step_id_idx    ON public.job_notifications (step_id);
CREATE INDEX job_notifications_created_by_idx ON public.job_notifications (created_by);

ALTER TABLE public.job_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_notifications admin read" ON public.job_notifications
  FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "job_notifications admin insert" ON public.job_notifications
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));

REVOKE ALL ON TABLE public.job_notifications FROM anon, PUBLIC;
```

Run `grep -ci drop supabase/migrations/012_job_notifications.sql` — Expected: `0`. Report the file's byte size (`wc -c`) and `md5 -q`.

- [ ] **Step 2 (controller): Dry run on prod, rolled back**

Assemble the script: take the dry-run template below, replace the line `@@MIGRATION@@` with the migration file text, check the result has no occurrence of the blocked word, and paste it unaltered into `execute_sql`:

```sql
do $outer$
declare
  admin_uid uuid; plain_uid uuid; staff_uid uuid; doe_id uuid;
  r record; n int; line text; out text := '';
  v_job uuid; v_step uuid; v_err text;
begin
  select id into admin_uid from public.profiles where role = 'admin' order by created_at limit 1;
  select id into plain_uid from public.profiles where role = 'client' order by created_at limit 1 offset 0;
  select id into staff_uid from public.profiles where role = 'client' order by created_at limit 1 offset 1;
  update public.profiles set role = 'staff' where id = staff_uid;      -- simulated staff, rolled back
  select id into doe_id from public.clients order by created_at limit 1;

  execute $mig$
@@MIGRATION@@
  $mig$;

  -- Fixtures as the table owner (RLS does not apply to it).
  insert into public.jobs (created_by, client_id, service_type, description) values (admin_uid, doe_id, 'business', 'zz probe') returning id into v_job;
  insert into public.job_steps (job_id, position, title_en, title_vi, owner, client_visible) values (v_job, 1, 'zz', 'zz', 'manna', true) returning id into v_step;
  insert into public.job_notifications (job_id, step_id, kind, to_email, status) values (v_job, v_step, 'step_done', 'zz@example.com', 'sent');

  -- Access matrix: four roles against the log.
  for r in select * from (values ('anon', null::uuid), ('client', plain_uid), ('staff', staff_uid), ('admin', admin_uid)) as v(label, uid) loop
    execute 'reset role';
    if r.label = 'anon' then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      execute 'set local role anon';
    else
      perform set_config('request.jwt.claims', json_build_object('sub', r.uid, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
    end if;
    line := 'MATRIX ' || rpad(r.label, 6) || ' read=';
    begin select count(*) into n from public.job_notifications; line := line || n;
    exception when others then line := line || 'ERR' || sqlstate; end;
    begin
      insert into public.job_notifications (job_id, kind, to_email, status, created_by) values (v_job, 'step_done', 'zz2@example.com', 'sent', r.uid);
      line := line || ' ins=ok';
    exception when others then line := line || ' ins=ERR' || sqlstate; end;
    begin update public.job_notifications set status = 'failed'; get diagnostics n = row_count; line := line || ' upd=' || n;
    exception when others then line := line || ' upd=ERR' || sqlstate; end;
    begin delete from public.job_notifications; get diagnostics n = row_count; line := line || ' del=' || n;
    exception when others then line := line || ' del=ERR' || sqlstate; end;
    out := out || line || E'\n';
    execute 'reset role';
  end loop;

  -- Constraints, as the table owner.
  begin insert into public.job_notifications (job_id, kind, to_email, status) values (v_job, 'bogus', 'a@b.co', 'sent'); v_err := 'no error';
  exception when others then v_err := sqlstate; end;
  out := out || 'CHECKS bogus_kind=' || v_err;
  begin insert into public.job_notifications (job_id, kind, to_email, status) values (v_job, 'step_done', 'a@b.co', 'bogus'); v_err := 'no error';
  exception when others then v_err := sqlstate; end;
  out := out || ' bogus_status=' || v_err;
  begin insert into public.job_notifications (job_id, kind, to_email, status) values (v_job, 'step_done', null, 'sent'); v_err := 'no error';
  exception when others then v_err := sqlstate; end;
  out := out || ' null_email=' || v_err || E'\n';

  -- Cascade: removing the step keeps the log (step_id empties); removing the job removes the log.
  delete from public.job_steps where id = v_step;
  select count(*) into n from public.job_notifications where job_id = v_job and step_id is null;
  out := out || 'CASCADE step_deleted: rows_with_no_step=' || n;
  delete from public.jobs where id = v_job;
  select count(*) into n from public.job_notifications where job_id = v_job;
  out := out || ' job_deleted: rows_left=' || n || E'\n';

  raise exception E'RESULT\n%', out;
end $outer$;
```

The script ends with `raise exception`, so everything is rolled back and the tool reports an error whose text starts `ERROR: P0001: RESULT`. Expected lines after it (exactly):

```
MATRIX anon   read=ERR42501 ins=ERR42501 upd=ERR42501 del=ERR42501
MATRIX client read=0 ins=ERR42501 upd=0 del=0
MATRIX staff  read=0 ins=ERR42501 upd=0 del=0
MATRIX admin  read=1 ins=ok upd=0 del=0
CHECKS bogus_kind=23514 bogus_status=23514 null_email=23502
CASCADE step_deleted: rows_with_no_step=2 job_deleted: rows_left=0
```

(If the tool answers "Invalid or expired requestState" with no SQLSTATE, the call never reached Postgres: run a short read-only query to refresh the session, then repeat once.)

- [ ] **Step 3 (controller): Prove nothing was left behind**

Run through `execute_sql`:

```sql
select to_regclass('public.job_notifications') as job_notifications,
       (select count(*) from public.jobs) as jobs,
       (select count(*) from public.job_steps) as job_steps,
       (select string_agg(role || '=' || c, ', ' order by role) from (select role, count(*) c from public.profiles group by role) x) as profile_roles;
```

Expected: `job_notifications` null, `jobs` 0, `job_steps` 0, `profile_roles` `admin=1, client=6` (unless real data was added since).

- [ ] **Step 4 (subagent): Commit**

```bash
git add apps/internal_app/supabase/migrations/012_job_notifications.sql
git commit -m "$(cat <<'EOF'
feat(internal-app): 012 — job_notifications log, admin-only

Not applied yet. Dry-run on prod in a rolled-back transaction: anon refused,
client and staff see nothing and cannot write, admin reads and appends only,
constraints and cascades as designed.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Actions, "Save & email" button and the history card

**Files:**
- Modify: `src/actions/jobs.ts`, `src/components/jobs/JobStepList.tsx`, `src/app/(app)/jobs/[id]/page.tsx`
- Create: `src/components/jobs/JobEmailHistory.tsx`

**Interfaces:**
- Consumes: `sendStepEmail` (Task 3), `sendWithResend` (Task 2), `listNotifications`, `NotificationRow` (Task 3), `emailKindFor` (Task 1), `timeAgo` from `@/lib/utils` (existing).
- Produces: server actions `emailStepUpdate(stepId): Promise<Result<{ to: string }>>` and `getJobNotifications(jobId): Promise<NotificationRow[]>`; `JobStepList({ steps, clientEmail })`; `JobEmailHistory({ notifications })`.

This task has no new unit tests (UI and thin actions; the logic they call is tested in Tasks 1–3). Verification is type-check, lint, the existing suites and a build.

- [ ] **Step 1: Replace the files**

Replace `src/actions/jobs.ts` with:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createJobFromTemplateRpc,
  findClientBrief,
  findJob,
  listJobTemplates,
  listJobs,
  listNotifications,
  updateStep,
} from '@/lib/jobs/jobs-db'
import { sendWithResend } from '@/lib/jobs/mailer'
import { sendStepEmail } from '@/lib/jobs/notify'
import { parseJobFilters, type JobFilters } from '@/lib/jobs/filters'
import { isUuid, parseNewJobInput, parseStepPatch } from '@/lib/jobs/validation'
import type {
  ClientBrief,
  JobDetail,
  JobListRow,
  JobStepRow,
  JobTemplateSummary,
  NotificationRow,
  Result,
} from '@/lib/jobs/types'

// Thin Next.js boundary over src/lib/jobs/jobs-db.ts: build the Supabase
// client, validate, call, revalidate. Access is decided by RLS (admin-only).

export async function getJobs(filters: JobFilters = {}): Promise<JobListRow[]> {
  // Re-validate: a server action can be called with anything.
  return listJobs(await createClient(), { filters: parseJobFilters(filters) })
}

export async function getJobsForClient(clientId: string): Promise<JobListRow[]> {
  if (!isUuid(clientId)) return []
  return listJobs(await createClient(), { clientId })
}

/** null for an unknown or malformed id, so the page can call notFound(). */
export async function getJob(id: string): Promise<JobDetail | null> {
  if (!isUuid(id)) return null
  return findJob(await createClient(), id)
}

export async function getJobTemplates(): Promise<JobTemplateSummary[]> {
  return listJobTemplates(await createClient())
}

export async function getClientBrief(id: string): Promise<ClientBrief | null> {
  if (!isUuid(id)) return null
  return findClientBrief(await createClient(), id)
}

export async function createJobFromTemplate(formData: FormData): Promise<Result<{ id: string }>> {
  const parsed = parseNewJobInput(formData)
  if (!parsed.ok) return parsed

  const result = await createJobFromTemplateRpc(await createClient(), parsed.value)
  if (result.ok) {
    revalidatePath('/jobs')
    revalidatePath(`/clients/${parsed.value.clientId}`)
  }
  return result
}

export async function updateJobStep(
  stepId: string,
  patch: { status?: unknown; client_note?: unknown; internal_note?: unknown }
): Promise<Result<JobStepRow>> {
  if (!isUuid(stepId)) return { ok: false, error: 'Unknown step.' }
  const parsed = parseStepPatch(patch)
  if (!parsed.ok) return parsed

  const result = await updateStep(await createClient(), stepId, parsed.value)
  if (result.ok) {
    revalidatePath(`/jobs/${result.value.job_id}`)
    revalidatePath('/jobs')
  }
  return result
}

export async function getJobNotifications(jobId: string): Promise<NotificationRow[]> {
  if (!isUuid(jobId)) return []
  return listNotifications(await createClient(), jobId)
}

/**
 * Emails the client about a step that is already saved. It reads the step
 * again from the database, so it never sends what the browser only thinks it
 * saved; RLS makes that read (and so the send) admin-only.
 */
export async function emailStepUpdate(stepId: string): Promise<Result<{ to: string }>> {
  if (!isUuid(stepId)) return { ok: false, error: 'Unknown step.' }
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const result = await sendStepEmail(supabase, sendWithResend, stepId, data.user?.id ?? null)
  // The send log changed whether or not the email went out.
  revalidatePath('/jobs/[id]', 'page')
  return result
}
```

Replace `src/components/jobs/JobStepList.tsx` with:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { emailStepUpdate, updateJobStep } from '@/actions/jobs'
import { emailKindFor } from '@/lib/jobs/email'
import {
  STEP_OWNER_LABELS,
  STEP_STATUSES,
  STEP_STATUS_LABELS,
  type StepStatus,
} from '@/lib/jobs/progress'
import type { JobStepRow } from '@/lib/jobs/types'

const STATUS_DOT: Record<StepStatus, string> = {
  todo: 'bg-slate-300',
  in_progress: 'bg-blue-500',
  waiting_client: 'bg-amber-500',
  done: 'bg-green-500',
  skipped: 'bg-slate-200',
}

const OWNER_STYLE: Record<JobStepRow['owner'], string> = {
  manna: 'bg-[rgba(58,175,185,0.1)] text-[#006970]',
  client: 'bg-amber-50 text-amber-700',
  third_party: 'bg-slate-100 text-slate-600',
}

type Message = { kind: 'ok' | 'error'; text: string } | null

function StepRow({ step, clientEmail }: { step: JobStepRow; clientEmail: string | null }) {
  const [status, setStatus] = useState<StepStatus>(step.status)
  const [clientNote, setClientNote] = useState(step.client_note ?? '')
  const [internalNote, setInternalNote] = useState(step.internal_note ?? '')
  // What the database holds now; the dot and the Save button compare against it.
  const [saved, setSaved] = useState({
    status: step.status,
    clientNote: step.client_note ?? '',
    internalNote: step.internal_note ?? '',
  })
  const [message, setMessage] = useState<Message>(null)
  const [pending, startTransition] = useTransition()

  const dirty =
    status !== saved.status ||
    clientNote !== saved.clientNote ||
    internalNote !== saved.internalNote

  // Offer the email only when the step is moving to a status the client cares about.
  const canEmail =
    step.client_visible && emailKindFor(status) !== null && status !== saved.status

  function save(emailClient: boolean) {
    setMessage(null)
    startTransition(async () => {
      const result = await updateJobStep(step.id, {
        status,
        client_note: clientNote,
        internal_note: internalNote,
      })
      if (!result.ok) {
        setMessage({ kind: 'error', text: result.error })
        return
      }
      setSaved({ status, clientNote, internalNote })
      if (!emailClient) {
        setMessage({ kind: 'ok', text: 'Saved' })
        return
      }
      // The step is saved either way; only the email can still fail.
      const mail = await emailStepUpdate(step.id)
      setMessage(
        mail.ok
          ? { kind: 'ok', text: `Saved and emailed ${mail.value.to}` }
          : { kind: 'error', text: `Saved. Email not sent: ${mail.error}` }
      )
    })
  }

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-4">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[saved.status]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {step.position}. {step.title_en}{' '}
                <span
                  className={`align-middle text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${OWNER_STYLE[step.owner]}`}
                >
                  {STEP_OWNER_LABELS[step.owner].en}
                </span>
              </p>
              <p className="text-xs text-slate-400">{step.title_vi}</p>
              {step.description_en && (
                <p className="mt-1 text-xs text-slate-500">{step.description_en}</p>
              )}
              {step.description_vi && (
                <p className="text-xs text-slate-400">{step.description_vi}</p>
              )}
            </div>
            <select
              aria-label={`Status of step ${step.position}`}
              value={status}
              onChange={(e) => setStatus(e.target.value as StepStatus)}
              disabled={pending}
              className="rounded-lg border border-[#bcc9ca]/60 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              {STEP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STEP_STATUS_LABELS[s].en}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Client note (shown to the client in the portal)
              </span>
              <textarea
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                rows={2}
                disabled={pending}
                className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Internal note (staff only)
              </span>
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
                disabled={pending}
                className="w-full rounded-lg border border-[#bcc9ca]/60 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={!dirty || pending}
              className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: '#3AAFB9' }}
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
            {canEmail && (
              <button
                type="button"
                onClick={() => save(true)}
                disabled={!clientEmail || pending}
                className="rounded-lg border border-[#3AAFB9] px-4 py-1.5 text-sm font-semibold text-[#006970] disabled:opacity-40"
              >
                Save &amp; email
              </button>
            )}
            {canEmail && (
              <span className="text-xs text-slate-500">
                {clientEmail
                  ? `Save & email will write to ${clientEmail}`
                  : 'This client has no email on file, so it cannot be emailed.'}
              </span>
            )}
            {message && (
              <span
                role="status"
                className={`text-xs font-semibold ${
                  message.kind === 'ok' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export default function JobStepList({
  steps,
  clientEmail,
}: {
  steps: JobStepRow[]
  clientEmail: string | null
}) {
  return (
    <ul className="divide-y divide-[#ebeef3]">
      {steps.map((step) => (
        <StepRow key={step.id} step={step} clientEmail={clientEmail} />
      ))}
    </ul>
  )
}
```

Create `src/components/jobs/JobEmailHistory.tsx`:

```tsx
import { timeAgo } from '@/lib/utils'
import type { NotificationRow } from '@/lib/jobs/types'

const CARD_SHADOW = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

const KIND_LABEL: Record<NotificationRow['kind'], string> = {
  step_done: 'Step done',
  step_waiting_client: 'Waiting on client',
}

export default function JobEmailHistory({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
      <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
        Emails sent to the client
      </h3>
      {notifications.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No emails sent yet.</p>
      ) : (
        <ul className="divide-y divide-[#ebeef3]">
          {notifications.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  n.status === 'sent' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {n.status}
              </span>
              <span className="text-sm text-slate-700">{n.to_email}</span>
              <span className="text-xs text-slate-400">
                {KIND_LABEL[n.kind]}
                {n.step ? ` · step ${n.step.position}: ${n.step.title_en}` : ' · step removed'}
                {' · '}
                {timeAgo(n.created_at)}
              </span>
              {n.error && <span className="w-full text-xs text-red-600">{n.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Replace `src/app/(app)/jobs/[id]/page.tsx` with:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getJob, getJobNotifications } from '@/actions/jobs'
import JobEmailHistory from '@/components/jobs/JobEmailHistory'
import JobProgressBar from '@/components/jobs/JobProgressBar'
import JobStatusBadge from '@/components/jobs/JobStatusBadge'
import JobStepList from '@/components/jobs/JobStepList'
import { deriveProgress } from '@/lib/jobs/progress'
import { formatCurrency, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const CARD_SHADOW = { boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.04)' }

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [job, notifications] = await Promise.all([getJob(id), getJobNotifications(id)])
  // A malformed id, a missing row and an RLS-hidden row are the same thing here.
  if (!job) notFound()

  const progress = deriveProgress(job.steps)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Jobs
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
            {job.description || 'Untitled job'}
          </h2>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-sm text-slate-400 mt-0.5">
          {job.client ? (
            <Link href={`/clients/${job.client.id}`} className="hover:underline">
              {job.client.last_name}, {job.client.first_name}
            </Link>
          ) : (
            '—'
          )}
          {' · '}
          {formatCurrency(job.fee)}
          {job.deadline && ` · due ${formatDate(job.deadline)}`}
        </p>
      </div>

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <JobProgressBar progress={progress} stepCount={job.steps.length} />
      </div>

      {job.notes && (
        <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Job notes (staff only)
          </p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-xl p-6" style={CARD_SHADOW}>
        <h3 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b border-[#ebeef3]">
          Steps
        </h3>
        {job.steps.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            This job has no steps. It was created without a template, so its status is set by hand.
          </p>
        ) : (
          <JobStepList steps={job.steps} clientEmail={job.client?.email ?? null} />
        )}
      </div>

      <JobEmailHistory notifications={notifications} />
    </div>
  )
}
```

- [ ] **Step 2: Run all checks**

Run: `pnpm --filter internal_app test` — Expected: `Test Suites: 15 passed`, `Tests: 179 passed`.
Run: `pnpm --filter internal_app type-check` — Expected: clean.
Run: `pnpm --filter internal_app exec eslint src/actions/jobs.ts src/components/jobs "src/app/(app)/jobs" src/lib/jobs __tests__/lib/jobs` — Expected: no output.
Run: `pnpm --filter internal_app build` — Expected: succeeds and the route table still lists `/jobs`, `/jobs/[id]`, `/jobs/new`. (If a dev server is running on port 3000 stop it first, or use a separate checkout.)

- [ ] **Step 3: Commit**

```bash
git add apps/internal_app/src/actions/jobs.ts apps/internal_app/src/components/jobs/JobStepList.tsx apps/internal_app/src/components/jobs/JobEmailHistory.tsx "apps/internal_app/src/app/(app)/jobs/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(internal-app): Save & email on a job step, with a send history

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Whole-slice verification, apply 012, owner smoke test, ROADMAP and memory

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify (memory, outside the repo): `/Users/anhnguyen/.claude/projects/-Users-anhnguyen-Obsidian-Business-planning/memory/business-progress-tracker.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the finished slice, recorded.

The controller does Steps 2–6 itself with the owner; a subagent may do Steps 1 and 7.

- [ ] **Step 1: Full automated checks**

| Command | Expected |
|---|---|
| `pnpm --filter internal_app test` | `Test Suites: 15 passed`, `Tests: 179 passed` |
| `pnpm --filter internal_app type-check` | no output |
| `pnpm --filter internal_app exec eslint` | `✖ 86 problems (79 errors, 7 warnings)` (unchanged: nothing added) |
| `pnpm --filter internal_app build` | succeeds |

- [ ] **Step 2: Ask the owner before touching prod**

Ask with `AskUserQuestion`: apply `012_job_notifications.sql` to the production database now? It only adds one new table and touches no existing data. Do nothing else on prod until the answer is yes.

- [ ] **Step 3: Apply and verify live (controller)**

Apply with `apply_migration`, name `job_notifications`, query = the file text. If the tool answers "Invalid or expired requestState", verify with a read-only `select to_regclass('public.job_notifications')` that nothing was applied, then retry once. Then run through `execute_sql`:

```sql
select (select string_agg(policyname || '[' || cmd || ']', ', ' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'job_notifications') as policies,
       (select count(*) from pg_tables where schemaname = 'public' and tablename = 'job_notifications' and rowsecurity) as rls_on,
       (select count(*) from public.job_notifications) as rows;
```

Expected: `job_notifications admin insert[INSERT], job_notifications admin read[SELECT]`, `rls_on` 1, `rows` 0. Then `get_advisors` type `security`: no finding may name `job_notifications`.

- [ ] **Step 4: Set up the local test (owner and controller)**

The owner adds to `apps/internal_app/.env.local` (never committed, never printed): `RESEND_API_KEY=<the same key the website uses on Vercel>`. `RESEND_FROM_EMAIL` and `RESEND_REPLY_TO` are optional (defaults apply). The test clients have no email: ask the owner for an address they can read, set it on the test client `test 1 test 2` (through the client page, or by SQL with the owner's yes), and note the original value (null) to restore in Step 6. Run `select now() as smoke_started_at;` and write the value down. Start `pnpm --filter internal_app dev`.

- [ ] **Step 5: Owner smoke test**

1. New Job for that client, "LLC formation". Open step 1, choose Done: a "Save & email" button and the line "Save & email will write to <address>" appear next to Save.
2. Click Save & email: message "Saved and emailed <address>". The email arrives: Vietnamese first, then English, service name, progress `1/9`, the step title, the client note once, a reply-to of `Chris@mannaos.com`. The "Emails sent to the client" card shows one SENT row.
3. Open step 3 (owned by Manna, client-visible), choose "Waiting on client" with a note containing `<b>bold</b>` and two lines, Save & email: the email has the "Việc của bạn / What we need from you" block, and the HTML in the note shows as text, not bold.
4. Choose In progress on any step: no Save & email button (only Save).
5. Choose Done and click plain Save: saved, no email, no new history row.
6. Remove the client's email (empty) and open a step with a new status: the hint says the client has no email and Save & email is disabled.
7. Double click Save & email quickly: exactly one email and one history row.
8. Failure path: stop the server, set `RESEND_API_KEY=bad` in `.env.local`, start it again, repeat step 2 on another step: "Saved. Email not sent: …", the step stays saved, a FAILED row with the reason appears. Put the real key back.

If any step fails, fix it with a new commit before continuing.

- [ ] **Step 6: Remove the test data (controller)**

Stop the dev server. Restore the test client's email to its original value. Then, with the `smoke_started_at` value from Step 4:

```sql
delete from public.jobs where created_at >= '<smoke_started_at value>';
select (select count(*) from public.jobs) as jobs, (select count(*) from public.job_steps) as job_steps, (select count(*) from public.job_notifications) as job_notifications;
```

Expected: `0, 0, 0` (steps and notifications go with their jobs).

- [ ] **Step 7: Update the ROADMAP and memory**

In `docs/ROADMAP.md`, in the "Business Progress Tracker" block change the Lát 2 line to checked `[x]` and describe what shipped (Resend from internal app, "Save & email" at Done / Waiting on client, bilingual email, `job_notifications` migration 012 applied to prod on the real date, owner smoke test passed). Note on the line that it needs `RESEND_API_KEY` in the environment where the app runs (relevant to lát 0). Update the `Last updated` line to today. Commit:

```bash
git add docs/ROADMAP.md
git commit -m "$(cat <<'EOF'
docs: ROADMAP — business progress tracker slice 2 (email)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

In `business-progress-tracker.md` record: slice 2 done (date, commit range), migration 012 applied, the env vars, that lát 0 must set `RESEND_API_KEY` on Vercel, and that slices 0 and 3 are next. Keep the `MEMORY.md` index line accurate.

- [ ] **Step 8: Report and ask about merging**

Summarise for the owner: what shipped, the live checks, the lint and test numbers, any deviation from this plan. Ask whether to merge into `main` and push. Do not push without a yes.

